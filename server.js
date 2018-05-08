require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const { Member } = require('./members/models');
const { Bill } = require('./bills/models');
const mongoose = require('mongoose');
const { DATABASE_URL } = require('./config');
const morgan = require('morgan');
const { proPublicaBillToMongo, getCosponsorsFor } = require('./bills/bill-utils');

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

app.get('/api/members/:memberId/bills', (req, res) => {
    // return all bills sponsored and cosponsored by member with memberId
    return Member.findOne({ memberId: req.params.memberId })
        .then(member => {
            const { billsSponsored, billsCosponsored } = member;
            const queryParams = { billId: { $in: [...billsSponsored, ...billsCosponsored] } };
            return Bill.find(queryParams)
                .then(bills => res.status(200).json({bills}))
        })
        .catch(err => {
            console.error(err);
            return res.status(500).json({message: 'Could not find bills for specified member'})
        })
});

app.get('/api/bills/recent', (req, res) => {
    // return list of recent bills fro ProPublica
    // if bills not in db, add them
});

app.get('/api/bills/:id', (req, res) => {
    // get specific bill by its billId
    Bill.findOne({billId: req.params.id})
        .then(bill => {
            if (!bill.cosponsors || bill.cosponsors.length < 1) {
                return getCosponsorsFor(bill.billId)
                    .then(proPubRes => {
                        if (proPubRes.status === 'ERROR') {
                            return Promise.reject({
                                code: 500,
                                message: 'error retrieving data from propublica'
                            })
                        }
                        return proPubRes.json()
                    })
                    .then(proPubJSON => {
                        bill.cosponsors = proPubJSON.results[0].cosponsors.map(cosponsor => cosponsor.cosponsor_id)
                        return bill.save()
                            .then(bill => res.status(200).json(bill.serialize()))
                    })
            } else {
                res.status(200).json(bill.serialize())
            }
        })
        .catch(err => {
            console.error(err);
            res.status(500).json({'message': 'Unable to fulfill request'})
        })
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