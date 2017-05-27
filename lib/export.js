const { MongoClient } = require('mongodb');
const chalk = require('chalk');
const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');
const pm2 = require('pm2');

const run = command => execSync(command, { cwd: __dirname }).toString('utf8');

async function pureExport({
    host = 'localhost',
    port = '27017',
    db,
    repo,
    branch = 'master',
    tmpDir = `${__dirname}/__tmp`,
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

    run(`rm -rf ${tmpDir}`);

    console.log(chalk.cyan('Cloning backup repository'));

    console.log(run(`
        eval \`ssh-agent -s\` &&
        ssh-add ~/.ssh/id_rsa &&
        git clone -b ${branch} ${repo} ${tmpDir} &&
        cd ${tmpDir}
    `));

    collectionNames.forEach((collection) => {
        if (collection === 'sessions') {
            return;
        }

        console.log(chalk.cyan(`Exporting ${collection}`));
        console.log(run(`mongoexport --db ${db} --collection ${collection} --out ${tmpDir}/${collection}.json`));
    });

    console.log(chalk.cyan(`Committing ${now}`));

    console.log(run(`
        cd ${tmpDir} &&
        ${gitUserEmail ? `git config user.email "${gitUserEmail}" &&` : ''}
        ${gitUserName ? `git config user.name "${gitUserName}" &&` : ''}
        git add --all &&
        git commit -m "Automatic mongoexport via mongo-git-backup - ${now}" ||
        echo 'Cannot commit. Looks like there are no changes at DB.'
    `));

    console.log(chalk.cyan('Pushing'));

    console.log(run(`
        cd ${tmpDir} &&
        git push origin ${branch}
    `));

    console.log(chalk.cyan('Cleaning up'));

    run(`rm -rf ${tmpDir}`);

    console.log(chalk.green('Done!'));
}

function daemonizeExport(options) {
    const { repo, branch = 'master' } = options;
    const instancesPath = path.resolve(__dirname, '../.instances.json');
    const instances = fs.existsSync(instancesPath)
        ? JSON.parse(fs.readFileSync(instancesPath)) : {};

    console.log(chalk.cyan('Daemonizing'));

    return new Promise((resolve, reject) => {
        instances[`${repo}#${branch}`] = options;

        fs.writeFileSync(instancesPath, JSON.stringify(instances, null, '\t'));

        pm2.connect((err) => {
            if (err) {
                reject(err);
                console.log(chalk.red(err));
                process.exit(2);
            }

            pm2.start({
                script: `${__dirname}/daemon.js`,
                name: 'mongo-git-backup'
            }, (err) => { // eslint-disable-line no-shadow
                pm2.disconnect();

                if (err) {
                    console.log(chalk.red(err));
                    reject(err);
                } else {
                    console.log(chalk.green('Done!'));
                    resolve();
                }
            });
        });

        return undefined;
    });
}

function exportToGit(options) {
    const { daemonize } = options;
    if (daemonize) {
        return daemonizeExport(Object.assign({
            interval: 300,
        }, options));
    }

    return pureExport(options);
}

module.exports = exportToGit;
