// tests/e2e.test.ts

import * as github from '@actions/github';
import fs from 'fs';
import path from 'path';
import {main} from '../src/main';

jest.mock('@actions/github', () => {
    const originalModule = jest.requireActual('@actions/github');
    return {
        ...originalModule,
        context: {
            ...originalModule.context,
            repo: {owner: 'na1307', repo: 'blazor-github-pages'},
        },
    };
});

describe('End-to-end test for dotnet-based Action', () => {
    const TEST_PROJ_NAME = 'TestProject';
    const PUBLISH_PATH = '_out';

    beforeAll(() => {
        process.env['INPUT_PROJECT-PATH'] = path.join(TEST_PROJ_NAME, `${TEST_PROJ_NAME}.csproj`);
        process.env['INPUT_PUBLISH-PATH'] = PUBLISH_PATH;
    });

    afterEach(() => {
        fs.rmSync(PUBLISH_PATH, {force: true, recursive: true});
        fs.rmSync(path.join(TEST_PROJ_NAME, 'bin'), {force: true, recursive: true});
        fs.rmSync(path.join(TEST_PROJ_NAME, 'obj'), {force: true, recursive: true});
    });

    it('non-main repo', async () => {
        await main();

        const publishedDir = path.join(PUBLISH_PATH, 'wwwroot');
        expect(fs.existsSync(publishedDir)).toBe(true);

        const indexHtml = path.join(publishedDir, 'index.html');
        const indexContent = fs.readFileSync(indexHtml, 'utf8');
        expect(indexContent).toContain(`base href="/${github.context.repo.repo}/"`);

        const fourOhFourHtml = path.join(publishedDir, '404.html');
        if (fs.existsSync(fourOhFourHtml)) {
            const fourOhFourContent = fs.readFileSync(fourOhFourHtml, 'utf8');
            expect(fourOhFourContent).toContain(`/${github.context.repo.repo}/?p=/`);
        }
    }, 60_000);

    it('main repo', async () => {
        github.context.repo.repo = 'na1307.github.io';

        await main();

        const publishedDir = path.join(PUBLISH_PATH, 'wwwroot');
        expect(fs.existsSync(publishedDir)).toBe(true);

        const indexHtml = path.join(publishedDir, 'index.html');
        const indexContent = fs.readFileSync(indexHtml, 'utf8');
        expect(indexContent).toContain('base href="/"');

        const fourOhFourHtml = path.join(publishedDir, '404.html');
        if (fs.existsSync(fourOhFourHtml)) {
            const fourOhFourContent = fs.readFileSync(fourOhFourHtml, 'utf8');
            expect(fourOhFourContent).toContain('/?p=/');
        }
    }, 60_000);
});
