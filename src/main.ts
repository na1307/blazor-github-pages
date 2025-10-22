import { exec } from '@actions/exec'
import { getInput, info, setFailed, setOutput, warning } from '@actions/core'
import * as fs from 'node:fs'
import path from 'node:path'
import { context, getOctokit } from '@actions/github'

export async function main(): Promise<void> {
    const dotnet = 'dotnet'

    // Validate `dotnet` installation
    try {
        await exec(dotnet, ['--info'], { silent: true })
    } catch (error: unknown) {
        if (error instanceof Error) {
            setFailed(`dotnet command failed (may be not found): ${error.message}`)
        } else {
            setFailed(`dotnet command failed (may be not found): ${String(error)}`)
        }

        return
    }

    // Get Project path
    const projectPath = getInput('project-path', { required: true, trimWhitespace: true })

    info(`Project Path: ${projectPath}`)

    // Check a project exists
    if (!fs.existsSync(projectPath)) {
        setFailed(`The project '${projectPath}' not found.`)

        return
    }

    // Restore dependencies
    info('Restoring dependencies...')

    try {
        await exec(dotnet, ['restore', `"${projectPath}"`])
    } catch (error: unknown) {
        if (error instanceof Error) {
            setFailed(`Restore failed: ${error.message}`)
        } else {
            setFailed(`Restore failed: ${String(error)}`)
        }

        return
    }

    // Build
    info('Building...')

    try {
        await exec(dotnet, ['build', `"${projectPath}"`, '--no-restore', '-c', 'Release'])
    } catch (error: unknown) {
        if (error instanceof Error) {
            setFailed(`Build failed: ${error.message}`)
        } else {
            setFailed(`Build failed: ${String(error)}`)
        }

        return
    }

    // Get Publish path
    const publishPath = getInput('publish-path')

    // Publish
    info('Publishing...')

    try {
        await exec(dotnet, ['publish', `"${projectPath}"`, '--no-build', '-c', 'Release', '-o', `"${publishPath}"`])
    } catch (error: unknown) {
        if (error instanceof Error) {
            setFailed(`Publish failed: ${error.message}`)
        } else {
            setFailed(`Publish failed: ${String(error)}`)
        }

        return
    }

    // wwwroot
    const wwwroot = path.join(publishPath, 'wwwroot')

    // wwwroot exists
    if (!fs.existsSync(wwwroot)) {
        setFailed(`wwwroot directory not found`)

        return
    }

    info(`wwwroot Path: ${wwwroot}`)
    setOutput('wwwroot-path', wwwroot)

    let cname: string | null

    try {
        const ok = getOctokit(getInput('gh-token'))
        cname = (await ok.request('GET /repos/{owner}/{repo}/pages', context.repo)).data.cname
    } catch (error: unknown) {
        warning(String(error))
        cname = null
    }

    // Check if the repository using custom domain or is not the default GitHub Pages repo
    if (!cname && context.repo.repo !== `${context.repo.owner}.github.io`) {
        info('Modifying index.html for this repository...')

        const indexHtml = path.join(wwwroot, 'index.html')
        const indexFileContent = fs.readFileSync(indexHtml, 'utf8').replaceAll('base href="/"', `base href="/${context.repo.repo}/"`)

        fs.writeFileSync(indexHtml, indexFileContent)

        const fourOhFourHtml = path.join(wwwroot, '404.html')

        if (fs.existsSync(fourOhFourHtml)) {
            info('Modifying 404.html for this repository...')

            const fourFileContent = fs.readFileSync(fourOhFourHtml, 'utf8').replaceAll('/?p=/', `/${context.repo.repo}/?p=/`)

            fs.writeFileSync(fourOhFourHtml, fourFileContent)
        }
    }
}
