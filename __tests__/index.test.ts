/**
 * Unit tests for the action's entrypoint, src/index.ts
 */

import * as main from '../src/main.ts'
import {describe, expect, it, vitest} from "vitest";

describe('index', () => {
    it('calls main when imported', async () => {
        // Mock the action's entrypoint
        const mainMock = vitest.spyOn(main, 'main').mockImplementation(() => Promise.resolve())

        // Call index.ts using dynamic import
        await import('../src/index.ts')

        // Assert that main was called
        expect(mainMock).toHaveBeenCalled()
    })
})
