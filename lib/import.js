const chalk = require('chalk');
const fs = require('mz/fs');
const os = require('os');

const run = require('./run');

const dir = `${os.homedir()}/.mongo-git-backup`;

async function importFromGit({
    db,
    repo,
    branch = 'master',
    tmpDir = `${dir}/tmp`,
    checkout,
}) {
    if (!(await fs.exists(dir))) {
        await fs.mkdir(dir);
    }

    console.log(chalk.yellow('Starting mongodb import'));

    console.log(chalk.cyan('Cleaning up (in case of errors)'));

    await run(`rm -rf ${tmpDir}`);

    console.log(chalk.cyan('Cloning backup repository'));

    try {
        await run(`eval \`ssh-agent -s\` &&
        ssh-add ~/.ssh/id_rsa`);
    } catch (e) {} // eslint-disable-line no-empty

    console.log(await run(`
        git clone -b ${branch} ${repo} ${tmpDir} &&
        cd ${tmpDir} ${checkout ? `&& git checkout ${checkout}` : ''}
    `));


    const fileNames = await fs.readdir(tmpDir);

    for (const fileName of fileNames.filter(f => /\.json$/.test(f))) {
        const [collection] = fileName.split('.');
        console.log(checkout);
        console.log(await run(`
            cd ${tmpDir} &&
            mongoimport --db ${db} --file ${fileName} --collection ${collection} --mode upsert
        `));
    }

    console.log(chalk.cyan(`Applied changes to "${db}" database`));

    console.log(chalk.cyan('Cleaning up'));

    await run(`rm -rf ${tmpDir}`);

    console.log(chalk.green('Done!'));
}

module.exports = importFromGit;
