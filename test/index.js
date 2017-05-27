const { MongoClient } = require('mongodb');
const expect = require('expect');
const importFromGit = require('../lib/import');
const exportToGit = require('../lib/export');

const dbName = 'mongo-git-backup-test';
const repo = process.env.TRAVIS
    ? 'https://$GH_TOKEN@github.com/finom/mongo-git-backup.git'
    : 'git@github.com:finom/mongo-git-backup.git';

const branch = 'test';

MongoClient.connect(`mongodb://localhost:27017/${dbName}`, async (err, db) => {
    if (err) {
        console.error(err);
        process.exit(1);
    }

    try {
        const collectionA = db.collection('collectionA');
        const collectionB = db.collection('collectionB');

        await Promise.all([
            collectionA.remove(),
            collectionB.remove()
        ]);

        await Promise.all([
            collectionA.insert([{ a: 1 }, { a: 2 }]),
            collectionB.insert([{ b: 3 }, { b: 4 }])
        ]);

        await exportToGit({
            db: dbName,
            repo,
            branch,
        });

        await Promise.all([
            collectionA.remove(),
            collectionB.remove()
        ]);

        expect(await collectionA.find().toArray()).toEqual([], 'Collection A is not dropped');
        expect(await collectionB.find().toArray()).toEqual([], 'Collection B is not dropped');

        await importFromGit({
            db: dbName,
            repo,
            branch,
        });

        expect(await collectionA.find({}, { a: 1, _id: 0 }).toArray()).toEqual([{ a: 1 }, { a: 2 }], 'Collection A is not restored');
        expect(await collectionB.find({}, { b: 1, _id: 0 }).toArray()).toEqual([{ b: 3 }, { b: 4 }], 'Collection B is not restored');

        console.log('Connected correctly to server.');
        db.close();
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
});
