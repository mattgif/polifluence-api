require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const { Member } = require('./members/models');
const { Bill } = require('./bills/models');
const mongoose = require('mongoose');
const { DATABASE_URL } = require('./config');
const morgan = require('morgan');

mongoose.Promise = global.Promise;
const app = express();

const PORT = process.env.PORT || 3000;

app.use(morgan('tiny'));
app.use(cors());

app.get('/api', (req, res) => {
    res.json({ok: true});
});

app.get('/api/members', (req, res) => {
   // returns all members
   return Member.find()
       .then(members => {
           return res.status(200).json(members.map(member => member.serialize()));
       })
       .catch(err => {
           console.error(err);
           res.status(500).json('Unexpected error retrieving data');
       });
});

app.get('/api/members/:memberId', (req, res) => {
    // get specific member
    return Member.findOne({memberId: req.params.memberId })
        .then(member => res.status(200).json(member.serialize()))
        .catch(err => {
            console.error(err);
            res.status(500).json('Unexpected error retrieving data');
        });
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