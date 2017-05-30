const fs = require('fs');
const os = require('os');
const { pureExport } = require('./export');

const dir = `${os.homedir()}/.mongo-git-backup`;

const instancesPath = `${dir}/instances.json`;
const instances = fs.existsSync(instancesPath) ? JSON.parse(fs.readFileSync(instancesPath)) : {};

for (const options of Object.values(instances)) {
    pureExport(options);
    setInterval(() => pureExport(options), options.interval * 1000 || 300 * 1000);
}
