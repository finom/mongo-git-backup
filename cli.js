#!/usr/bin/env node
const { argv } = require('yargs');
const { exportToGit, importFromGit } = require('./');

const {
    _: [type],
    host,
    port,
    db,
    repo,
    branch,
    tmpDir,
    userName,
    userEmail,
    daemonize,
    undaemonize,
    interval,
    checkout,
} = argv;

const options = {
    host,
    port,
    db,
    repo,
    branch,
    tmpDir,
    userName,
    userEmail,
    daemonize,
    undaemonize,
    interval,
    checkout,
};

if (!db) {
    throw Error('--db parameter is required');
}

if (!repo) {
    throw Error('--repo parameter is required');
}

if (type === 'export') {
    exportToGit(options);
} else if (type === 'import') {
    importFromGit(options);
} else {
    throw Error(`Bad type parameter "${type}"`);
}
