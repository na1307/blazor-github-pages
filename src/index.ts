import * as core from '@actions/core'
import * as exec from '@actions/exec'
import * as fs from 'node:fs'
import repoName from 'git-repo-name';

async function main(): Promise<void> {
  try {
    const projectPath = core.getInput('project-path');
    const publishPath = core.getInput('publish-path');
    const isMainRepo = core.getBooleanInput('main-repo');
    const fix404 = core.getBooleanInput('fix-404');
    const dotnet: string = 'dotnet';

    core.info('Restoring dependencies...');
    const restoreResult = await exec.exec(dotnet, [
      'restore',
      `"${projectPath}"`
    ]);

    if (restoreResult) {
      throw new Error('Restore failed.');
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
      throw new Error('Build failed.');
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
      throw new Error('Publish failed.');
    }

    core.setOutput('wwwroot-path', `${publishPath}/wwwroot`);

    if (!isMainRepo) {
      core.info('Modifiyng index.html for this repository...');
      const repo = await repoName();
      let indexFileContent = fs.readFileSync(`${publishPath}/wwwroot/index.html`, 'utf8');

      indexFileContent = indexFileContent.replaceAll('base href="/"', `base href="/${repo}/"`);

      fs.writeFileSync(`${publishPath}/wwwroot/index.html`, indexFileContent);

      if (fix404) {
        core.info('Modifiyng 404.html for this repository...');
        let fourFileContent = fs.readFileSync(`${publishPath}/wwwroot/404.html`, 'utf8');

        fourFileContent = fourFileContent.replaceAll('/?p=/', `/${repo}/?p=/`);

        fs.writeFileSync(`${publishPath}/wwwroot/404.html`, fourFileContent);
      }
    }

    core.info('Creating .nojekyll...');
    fs.writeFileSync(`${publishPath}/wwwroot/.nojekyll`, '');
  } catch (error: any) {
    core.setFailed(error.message);
  }
}

main();
