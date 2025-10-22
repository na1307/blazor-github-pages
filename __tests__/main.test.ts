/**
 * @file Unit tests for the main action logic in `src/main.ts`.
 * These tests use Vitest to mock external dependencies and verify the action's behavior in isolation.
 */
import { afterEach, describe, expect, it, vi } from 'vitest'
import { context } from '@actions/github'
import { main } from '../src/main.ts'

// Hoist mocks to the top. This is a Vitest requirement to ensure mocks are available before imports.
const execMock = vi.hoisted(() => vi.fn())
const getInputMock = vi.hoisted(() => vi.fn())
const infoMock = vi.hoisted(() => vi.fn())
const setFailedMock = vi.hoisted(() => vi.fn())
const setOutputMock = vi.hoisted(() => vi.fn())
const warningMock = vi.hoisted(() => vi.fn())
const existsSyncMock = vi.hoisted(() => vi.fn())
const readFileSyncMock = vi.hoisted(() => vi.fn())
const writeFileSyncMock = vi.hoisted(() => vi.fn())
const getOctokitMock = vi.hoisted(() => vi.fn())

// Mock external modules to isolate the main function from side effects (e.g., file system, network, command execution).
vi.mock('@actions/exec', () => ({ exec: execMock }))
vi.mock('@actions/core', () => ({
    getInput: getInputMock,
    info: infoMock,
    setFailed: setFailedMock,
    setOutput: setOutputMock,
    warning: warningMock
}))
vi.mock('node:fs', () => ({
    existsSync: existsSyncMock,
    readFileSync: readFileSyncMock,
    writeFileSync: writeFileSyncMock
}))
vi.mock('node:path', () => ({
    __esModule: true, // Handle CJS/ESM default import interop for the 'path' module.
    default: {
        join: (...paths: string[]) => paths.join('/') // Force POSIX path separators for consistent testing across platforms.
    }
}))
vi.mock('@actions/github', () => ({
    context: {
        repo: {
            owner: 'test-owner',
            repo: 'test-repo'
        }
    },
    getOctokit: getOctokitMock
}))

/**
 * Defines the shape of the options for our mock setup function.
 * This allows for type-safe configuration of different test scenarios.
 */
type MockOptions = {
    projectExists?: boolean
    wwwrootExists?: boolean
    fourOhFourExists?: boolean
    owner?: string
    repoName?: string
    cname?: string | null
    octokitError?: Error
}

/**
 * A helper function to configure the mocks for a specific test case.
 * This avoids code duplication and clarifies each test's intent.
 * @param {MockOptions} options - The specific mock configuration for the test.
 */
const setupMocks = (options: MockOptions = {}) => {
    const {
        projectExists = true,
        wwwrootExists = true,
        fourOhFourExists = true,
        owner = 'na1307',
        repoName = 'test-repo',
        cname = null,
        octokitError = undefined
    } = options

    // Mock action inputs
    getInputMock.mockImplementation((name: string) => {
        switch (name) {
            case 'project-path':
                return 'MyProject/MyProject.csproj'
            case 'publish-path':
                return '_out'
            case 'gh-token':
                return 'test-token'
            default:
                return ''
        }
    })

    // Mock command execution to succeed by default
    execMock.mockResolvedValue(0)

    // Mock file system existence checks
    existsSyncMock.mockImplementation((path: string) => {
        if (path.endsWith('.csproj')) return projectExists
        if (path.endsWith('wwwroot')) return wwwrootExists
        if (path.endsWith('404.html')) return fourOhFourExists
        return true
    })

    // Mock file system reads
    readFileSyncMock.mockImplementation((path: string) => {
        if (path.endsWith('index.html')) {
            return '<html><head><base href="/" /></head></html>'
        }
        if (path.endsWith('404.html')) {
            return '<body><a href="/?p=/">go home</a></body>'
        }
        return ''
    })

    // Mock the GitHub API client
    if (octokitError) {
        getOctokitMock.mockReturnValue({
            request: vi.fn().mockRejectedValue(octokitError)
        })
    } else {
        getOctokitMock.mockReturnValue({
            request: vi.fn().mockResolvedValue({ data: { cname } })
        })
    }

    // Mock the repository context
    context.repo.owner = owner
    context.repo.repo = repoName
}

// Test suite for the core logic scenarios of the action.
describe('Action Logic Scenarios', () => {
    afterEach(() => {
        // Reset mocks after each test to ensure isolation.
        vi.resetAllMocks()
    })

    it('should modify HTML for a sub-repository without a custom domain', async () => {
        setupMocks({ repoName: 'SimpleRandom', cname: null })

        await main()

        expect(writeFileSyncMock).toHaveBeenCalledWith('_out/wwwroot/index.html', '<html><head><base href="/SimpleRandom/" /></head></html>')
        expect(writeFileSyncMock).toHaveBeenCalledWith('_out/wwwroot/404.html', '<body><a href="/SimpleRandom/?p=/">go home</a></body>')
    })

    it('should NOT modify HTML for a main repository', async () => {
        setupMocks({ repoName: 'na1307.github.io', cname: null })

        await main()

        expect(writeFileSyncMock).not.toHaveBeenCalled()
    })

    it('should NOT modify HTML for a sub-repository with a custom domain', async () => {
        setupMocks({ repoName: 'my-project', cname: 'www.my-project.com' })

        await main()

        expect(writeFileSyncMock).not.toHaveBeenCalled()
    })

    it('should not modify 404.html if it does not exist', async () => {
        setupMocks({ repoName: 'SimpleRandom', cname: null, fourOhFourExists: false })

        await main()

        expect(writeFileSyncMock).toHaveBeenCalledWith('_out/wwwroot/index.html', '<html><head><base href="/SimpleRandom/" /></head></html>')
        expect(writeFileSyncMock).not.toHaveBeenCalledWith('_out/wwwroot/404.html', expect.any(String))
    })
})

// Test suite for various failure conditions to ensure the action fails gracefully.
describe('Failure Cases', () => {
    afterEach(() => {
        vi.resetAllMocks()
    })

    it('should fail if dotnet is not found', async () => {
        setupMocks()
        execMock.mockImplementation(async (cmd: string) => (cmd === 'dotnet' ? Promise.reject(new Error('not found')) : 0))

        await main()

        expect(setFailedMock).toHaveBeenCalledWith('dotnet command failed (may be not found): not found')
    })

    it('should fail if project file does not exist', async () => {
        setupMocks({ projectExists: false })
        await main()

        expect(setFailedMock).toHaveBeenCalledWith("The project 'MyProject/MyProject.csproj' not found.")
    })

    it('should fail on dotnet restore error', async () => {
        setupMocks()
        execMock.mockImplementation(async (_cmd: string, args?: string[]) => (args?.includes('restore') ? Promise.reject(new Error('restore failed')) : 0))

        await main()

        expect(setFailedMock).toHaveBeenCalledWith('Restore failed: restore failed')
    })

    it('should fail on dotnet build error', async () => {
        setupMocks()
        execMock.mockImplementation(async (_cmd: string, args?: string[]) => (args?.includes('build') ? Promise.reject(new Error('build failed')) : 0))

        await main()

        expect(setFailedMock).toHaveBeenCalledWith('Build failed: build failed')
    })

    it('should fail on dotnet publish error', async () => {
        setupMocks()
        execMock.mockImplementation(async (_cmd: string, args?: string[]) => (args?.includes('publish') ? Promise.reject(new Error('publish failed')) : 0))

        await main()

        expect(setFailedMock).toHaveBeenCalledWith('Publish failed: publish failed')
    })

    it('should fail if wwwroot directory is not found', async () => {
        setupMocks({ wwwrootExists: false })
        await main()

        expect(setFailedMock).toHaveBeenCalledWith('wwwroot directory not found')
    })

    it('should still modify HTML if GitHub API call fails', async () => {
        setupMocks({ repoName: 'SimpleRandom', octokitError: new Error('API error') })
        await main()

        expect(warningMock).toHaveBeenCalledWith('Error: API error')
        // Should proceed assuming it's a sub-repo without a CNAME
        expect(writeFileSyncMock).toHaveBeenCalledWith('_out/wwwroot/index.html', '<html><head><base href="/SimpleRandom/" /></head></html>')
    })

    it('should fail with a string error if dotnet is not found', async () => {
        setupMocks()
        execMock.mockImplementation(async (cmd: string) => (cmd === 'dotnet' ? Promise.reject('dotnet not found') : 0))

        await main()

        expect(setFailedMock).toHaveBeenCalledWith('dotnet command failed (may be not found): dotnet not found')
    })

    it('should fail with a string error on dotnet restore', async () => {
        setupMocks()
        execMock.mockImplementation(async (_cmd: string, args?: string[]) => (args?.includes('restore') ? Promise.reject('restore failed') : 0))

        await main()

        expect(setFailedMock).toHaveBeenCalledWith('Restore failed: restore failed')
    })

    it('should fail with a string error on dotnet build', async () => {
        setupMocks()
        execMock.mockImplementation(async (_cmd: string, args?: string[]) => (args?.includes('build') ? Promise.reject('build failed') : 0))

        await main()

        expect(setFailedMock).toHaveBeenCalledWith('Build failed: build failed')
    })

    it('should fail with a string error on dotnet publish', async () => {
        setupMocks()
        execMock.mockImplementation(async (_cmd: string, args?: string[]) => (args?.includes('publish') ? Promise.reject('publish failed') : 0))

        await main()

        expect(setFailedMock).toHaveBeenCalledWith('Publish failed: publish failed')
    })
})
