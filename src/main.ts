import * as core from '@actions/core'
import * as exec from '@actions/exec'
import * as fs from 'node:fs'
import * as path from "node:path";
import {context, getOctokit} from '@actions/github';

export async function main(): Promise<void> {
    const dotnet: string = 'dotnet';

    // Validate `dotnet` installation
    try {
        await exec.exec(dotnet, ['--info'], {silent: true});
    } catch (error: any) {
        core.setFailed(`dotnet command failed (may be not found): ${error.message}`);
        return;
    }

    // Get Project path
    const projectPath = core.getInput('project-path', {required: true, trimWhitespace: true});

    core.info(`Project Path: ${projectPath}`);

    // Check project exists
    if (!fs.existsSync(projectPath)) {
        core.setFailed(`The project '${projectPath}' not found.`);
        return;
    }

    // Restore dependencies
    core.info('Restoring dependencies...');

    try {
        await exec.exec(dotnet, ['restore', `"${projectPath}"`]);
    } catch (error: any) {
        core.setFailed(`Restore failed: ${error.message}`);
        return;
    }

    // Build
    core.info('Building...');

    try {
        await exec.exec(dotnet, ['build', `"${projectPath}"`, '--no-restore', '-c', 'Release']);
    } catch (error: any) {
        core.setFailed(`Build failed: ${error.message}`);
        return;
    }

    // Get Publish path
    const publishPath = core.getInput('publish-path');

    // Publish
    core.info('Publishing...');

    try {
        await exec.exec(dotnet, ['publish', `"${projectPath}"`, '--no-build', '-c', 'Release', '-o', `"${publishPath}"`]);
    } catch (error: any) {
        core.setFailed(`Publish failed: ${error.message}`);
        return;
    }

    // wwwroot
    const wwwroot = path.join(publishPath, 'wwwroot');

    // wwwroot exists
    if (!fs.existsSync(wwwroot)) {
        core.setFailed(`wwwroot directory not found`);
        return;
    }

    core.info(`wwwroot Path: ${wwwroot}`);
    core.setOutput('wwwroot-path', wwwroot);

    const ok = getOctokit(core.getInput('gh-token'))
    const cname = (await ok.request('GET /repos/{owner}/{repo}/pages', context.repo)).data.cname

    // Check if the repository using custom domain or is not the default GitHub Pages repo
    if (!cname && context.repo.repo !== `${context.repo.owner}.github.io`) {
        core.info('Modifying index.html for this repository...');

        const indexhtml = path.join(wwwroot, 'index.html');
        const indexFileContent = fs.readFileSync(indexhtml, 'utf8')
            .replaceAll('base href="/"', `base href="/${context.repo.repo}/"`);

        fs.writeFileSync(indexhtml, indexFileContent);

        const fourohfourhtml = path.join(wwwroot, '404.html');

        if (fs.existsSync(fourohfourhtml)) {
            core.info('Modifying 404.html for this repository...');

            const fourFileContent = fs.readFileSync(fourohfourhtml, 'utf8')
                .replaceAll('/?p=/', `/${context.repo.repo}/?p=/`);

            fs.writeFileSync(fourohfourhtml, fourFileContent);
        }
    }
}
