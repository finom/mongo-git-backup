const fs = require('fs');
const path = require('path');

const exportToGit = require('./export');

const instancesPath = path.resolve(__dirname, '../.instances.json');
const instances = fs.existsSync(instancesPath) ? JSON.parse(fs.readFileSync(instancesPath)) : {};

for (const options of Object.values(instances)) {
    exportToGit(options);
    setInterval(() => exportToGit(options), options.interval * 1000);
}
