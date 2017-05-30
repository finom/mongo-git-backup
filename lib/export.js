const { MongoClient } = require('mongodb');
const chalk = require('chalk');
const fs = require('mz/fs');
const os = require('os');

const run = require('./run');

const dir = `${os.homedir()}/.mongo-git-backup`;

async function pureExport({
    host = 'localhost',
    port = '27017',
    db,
    repo,
    branch = 'master',
    tmpDir = `${dir}/tmp`,
    gitUserName,
    gitUserEmail
}) {
    const now = new Date();

    console.log(chalk.yellow('Starting mongodb export'));

    const collectionNames = await new Promise((resolve, reject) => {
        MongoClient.connect(`mongodb://${host}:${port}/${db}`, (err, connection) => {
            connection.listCollections().toArray((err, items) => { // eslint-disable-line no-shadow
                if (err) {
                    console.log(chalk.red(err));
                    reject(err);
                } else {
                    resolve(items.map(({ name }) => name));
                }
            });

            connection.close();
        });
    });

    console.log(chalk.cyan('Cleaning up'));

    await run(`rm -rf ${tmpDir}`);

    console.log(chalk.cyan('Cloning backup repository'));

    try {
        // Travis CI and maybe other environments require this step
        await run(`eval \`ssh-agent -s\` &&
        ssh-add ~/.ssh/id_rsa`);
    } catch (e) {} // eslint-disable-line no-empty

    console.log(await run(`
        git clone -b ${branch} ${repo} ${tmpDir} &&
        cd ${tmpDir}
    `));

    for (const collection of collectionNames) {
        if (collection === 'sessions') {
            return;
        }

        console.log(chalk.cyan(`Exporting ${collection}`));
        console.log(await run(`mongoexport --db ${db} --collection ${collection} --out ${tmpDir}/${collection}.json`));
    }

    console.log(chalk.cyan(`Committing ${now}`));

    console.log(await run(`
        cd ${tmpDir} &&
        ${gitUserEmail ? `git config user.email "${gitUserEmail}" &&` : ''}
        ${gitUserName ? `git config user.name "${gitUserName}" &&` : ''}
        git add --all &&
        git commit -m "Automatic mongoexport via mongo-git-backup - ${now}" ||
        echo 'Cannot commit. Looks like there are no changes at DB.'
    `));

    console.log(chalk.cyan('Pushing'));

    console.log(await run(`
        cd ${tmpDir} &&
        git push origin ${branch}
    `));

    console.log(chalk.cyan('Cleaning up'));

    await run(`rm -rf ${tmpDir}`);

    console.log(chalk.green('Done!'));
}

async function daemonizeExport(options) {
    const { repo, branch = 'master' } = options;
    const instancesPath = `${dir}/instances.json`;
    const instances = await fs.exists(instancesPath)
        ? JSON.parse(await fs.readFile(instancesPath)) : {};

    console.log(chalk.cyan('Daemonizing'));

    instances[`${repo}#${branch}`] = options;

    await fs.writeFile(instancesPath, JSON.stringify(instances, null, '\t'));

    console.log(await run(`pm2 start ${__dirname}/daemon.js --name="mongo-git-backup" --error="${dir}/error.log" --log="${dir}/out.log"`));

    console.log(chalk.green('Done!'));

    return undefined;
}

async function undaemonizeExport(options) {
    const { repo, branch = 'master' } = options;
    const instancesPath = `${dir}/instances.json`;
    const instances = await fs.exists(instancesPath)
        ? JSON.parse(await fs.readFile(instancesPath)) : {};

    console.log(chalk.cyan('UnDaemonizing'));

    delete instances[`${repo}#${branch}`];

    await fs.writeFile(instancesPath, JSON.stringify(instances, null, '\t'));

    console.log(await run('pm2 delete mongo-git-backup'));

    console.log(chalk.green('Done!'));

    return undefined;
}

async function exportToGit(options) {
    const { daemonize, undaemonize } = options;

    if (!(await fs.exists(dir))) {
        await fs.mkdir(dir);
    }

    if (undaemonize) {
        return undaemonizeExport(options);
    }

    if (daemonize) {
        return daemonizeExport(options);
    }

    return pureExport(options);
}

module.exports = exportToGit;

module.exports.pureExport = pureExport;
