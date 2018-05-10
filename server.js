require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const { DATABASE_URL } = require('./config');
const billRouter = require('./bills/router');
const memberRouter = require('./members/router');
const morgan = require('morgan');

mongoose.Promise = global.Promise;
const app = express();

const PORT = process.env.PORT || 3000;

app.use(morgan('tiny'));
app.use(function (req, res, next) {
    // Website you wish to allow to connect
    res.setHeader('Access-Control-Allow-Origin', '*');

    // Request methods you wish to allow
    res.setHeader('Access-Control-Allow-Methods', 'GET');

    // Request headers you wish to allow
    res.setHeader('Access-Control-Allow-Headers', 'X-Requested-With,content-type');

    // Pass to next layer of middleware
    next();
});

app.use('/api/bills', billRouter);
app.use('/api/members', memberRouter);

app.get('/api', (req, res) => {
    res.json({ok: true});
});

app.get('*', (req, res) => {
    res.status(404).json({message: 'endpoint not found'});
});

let server;
function runServer(databaseUrl = DATABASE_URL, port = PORT) {
    return new Promise((resolve, reject) => {
        mongoose.connect(databaseUrl, err => {
            if (err) {
                return reject(err);
            }
            server = app.listen(port, () => {
                console.log(`Your app is listening on port ${port}`);
                resolve();
            })
                .on('error', err => {
                    mongoose.disconnect();
                    reject(err);
                });
        });
    });
}

function closeServer() {
    return mongoose.disconnect().then(() => {
        return new Promise((resolve, reject) => {
            console.log('Closing server');
            server.close(err => {
                if (err) {
                    return reject(err);
                }
                resolve();
            });
        });
    });
}

if (require.main === module) {
    runServer().catch(err => console.error(err));
}

module.exports = {app, runServer, closeServer};