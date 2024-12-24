import * as core from '@actions/core'
import * as exec from '@actions/exec'
import * as fs from 'node:fs'
import {context} from '@actions/github';

async function main(): Promise<void> {
    try {
        const projectPath = core.getInput('project-path', {required: true, trimWhitespace: true});
        const publishPath = core.getInput('publish-path');
        const dotnet: string = 'dotnet';

        core.info(`Project Path: ${projectPath}`);
        
        if (!fs.existsSync(projectPath)) {
            core.setFailed('The project not found.');
            return;
        }

        core.info('Restoring dependencies...');
        const restoreResult = await exec.exec(dotnet, [
            'restore',
            `"${projectPath}"`
        ]);

        if (restoreResult) {
            core.setFailed('Restore failed.');
            return;
        }

        core.info('Building...');
        const buildResult = await exec.exec(dotnet, [
            'build',
            `"${projectPath}"`,
            '--no-restore',
            '-c',
            'Release'
        ]);

        if (buildResult) {
            core.setFailed('Build failed.');
            return;
        }

        core.info('Publishing...');
        const publishResult = await exec.exec(dotnet, [
            'publish',
            `"${projectPath}"`,
            '--no-build',
            '-c',
            'Release',
            '-o',
            `"${publishPath}"`
        ]);

        if (publishResult) {
            core.setFailed('Publish failed.');
            return;
        }

        core.info(`wwwroot Path: ${publishPath}/wwwroot`);
        core.setOutput('wwwroot-path', `${publishPath}/wwwroot`);

        if (context.repo.repo !== `${context.repo.owner}.github.io`) {
            core.info('Modifying index.html for this repository...');
            let indexFileContent = fs.readFileSync(`${publishPath}/wwwroot/index.html`, 'utf8');

            indexFileContent = indexFileContent.replaceAll('base href="/"', `base href="/${context.repo.repo}/"`);

            fs.writeFileSync(`${publishPath}/wwwroot/index.html`, indexFileContent);

            if (fs.existsSync(`${publishPath}/wwwroot/404.html`)) {
                core.info('Modifying 404.html for this repository...');
                let fourFileContent = fs.readFileSync(`${publishPath}/wwwroot/404.html`, 'utf8');

                fourFileContent = fourFileContent.replaceAll('/?p=/', `/${context.repo.repo}/?p=/`);

                fs.writeFileSync(`${publishPath}/wwwroot/404.html`, fourFileContent);
            }
        }

        //core.info('Creating .nojekyll...');
        //fs.writeFileSync(`${publishPath}/wwwroot/.nojekyll`, '');
    } catch (error: any) {
        if (error instanceof Error) {
            core.setFailed(error);
        }
    }
}

main();
