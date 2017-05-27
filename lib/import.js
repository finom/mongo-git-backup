const { execSync } = require('child_process');
const chalk = require('chalk');
const fs = require('fs');

const run = command => execSync(command, { cwd: __dirname }).toString('utf8');

async function importFromGit({
    db,
    repo,
    branch = 'master',
    tmpDir = `${__dirname}/__tmp`
}) {
    console.log(chalk.yellow('Starting mongodb import'));

    console.log(chalk.cyan('Cleaning up (in case of errors)'));

    run(`rm -rf ${tmpDir}`);

    console.log(chalk.cyan('Cloning backup repository'));

    try {
        run(`eval \`ssh-agent -s\` &&
        ssh-add ~/.ssh/id_rsa`);
    } catch (e) {} // eslint-disable-line no-empty

    console.log(run(`git clone -b ${branch} ${repo} ${tmpDir}`));


    fs.readdirSync(tmpDir).filter(fileName => /\.json$/.test(fileName)).forEach((fileName) => {
        const [collection] = fileName.split('.');

        console.log(run(`
            cd ${tmpDir} &&
            mongoimport --db ${db} --file ${fileName} --collection ${collection} --mode upsert
        `));
    });

    console.log(chalk.cyan(`Applied changes to "${db}" database`));

    console.log(chalk.cyan('Cleaning up'));

    run(`rm -rf ${tmpDir}`);

    console.log(chalk.green('Done!'));
}

module.exports = importFromGit;
