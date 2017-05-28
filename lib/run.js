const { exec } = require('mz/child_process');

module.exports = async (command) => {
    const stdout = await exec(command, {
        cwd: __dirname,
        uid: process.getuid()
    });

    return stdout.toString('utf8');
};
