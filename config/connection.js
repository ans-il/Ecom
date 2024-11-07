const { MongoClient } = require("mongodb");

const state = {
    db: null
};

module.exports.connect = async (done) => {
    const url = 'mongodb://localhost:27017';
    const dbName = 'ecom';

    try {
        const client = await MongoClient.connect(url);
        state.db = client.db(dbName);
        done();
    } catch (err) {
        done(err);
    }
};

module.exports.get = () => state.db;
