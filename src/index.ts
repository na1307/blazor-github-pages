import * as core from '@actions/core'
import * as exec from '@actions/exec'
import * as fs from 'node:fs'
import * as path from "node:path";
import {context} from '@actions/github';

async function main(): Promise<void> {
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
    const absoluteProjectPath = path.resolve(path.join('.', projectPath));

    core.info(`Project Path: ${projectPath}`);

    // Check project exists
    if (!fs.existsSync(absoluteProjectPath)) {
        core.setFailed(`The project '${projectPath}' not found.`);
        return;
    }

    // Restore dependencies
    core.info('Restoring dependencies...');

    try {
        await exec.exec(dotnet, ['restore', `"${absoluteProjectPath}"`]);
    } catch (error: any) {
        core.setFailed(`Restore failed: ${error.message}`);
        return;
    }

    // Build
    core.info('Building...');

    try {
        await exec.exec(dotnet, ['build', `"${absoluteProjectPath}"`, '--no-restore', '-c', 'Release']);
    } catch (error: any) {
        core.setFailed(`Build failed: ${error.message}`);
        return;
    }

    // Get Publish path
    const publishPath = core.getInput('publish-path');
    const absolutePublishPath = path.resolve(path.join('.', publishPath));
    
    // Publish
    core.info('Publishing...');

    try {
        await exec.exec(dotnet, ['publish', `"${absoluteProjectPath}"`, '--no-build', '-c', 'Release', '-o', `"${absolutePublishPath}"`]);
    } catch (error: any) {
        core.setFailed(`Publish failed: ${error.message}`);
        return;
    }

    // wwwroot
    const wwwroot = path.join(publishPath, 'wwwroot');
    const absolutewwwroot = path.join(absolutePublishPath, 'wwwroot');

    // wwwroot exists
    if (!fs.existsSync(absolutewwwroot)) {
        core.setFailed(`wwwroot directory not found`);
        return;
    }

    core.info(`wwwroot Path: ${wwwroot}`);
    core.setOutput('wwwroot-path', wwwroot);

    // Check if the repository is not the default GitHub Pages repo
    if (context.repo.repo !== `${context.repo.owner}.github.io`) {
        core.info('Modifying index.html for this repository...');

        const indexhtml = path.join(absolutewwwroot, 'index.html');
        const indexFileContent = fs.readFileSync(indexhtml, 'utf8')
            .replaceAll('base href="/"', `base href="/${context.repo.repo}/"`);

        fs.writeFileSync(indexhtml, indexFileContent);

        const fourohfourhtml = path.join(absolutewwwroot, '404.html');

        if (fs.existsSync(fourohfourhtml)) {
            core.info('Modifying 404.html for this repository...');

            const fourFileContent = fs.readFileSync(fourohfourhtml, 'utf8')
                .replaceAll('/?p=/', `/${context.repo.repo}/?p=/`);

            fs.writeFileSync(fourohfourhtml, fourFileContent);
        }
    }
}

main();
