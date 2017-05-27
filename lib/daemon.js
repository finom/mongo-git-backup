const fs = require('fs');
const path = require('path');
const homedir = require('os').homedir();

const { pureExport } = require('./export');

const instancesPath = path.resolve(homedir, '.pm2/.mongo-git-backup-instances.json');
const instances = fs.existsSync(instancesPath) ? JSON.parse(fs.readFileSync(instancesPath)) : {};

for (const options of Object.values(instances)) {
    pureExport(options);
    setInterval(() => pureExport(options), options.interval * 1000 || 300 * 1000);
}
