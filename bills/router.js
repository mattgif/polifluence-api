const express = require('express');
const { Bill } = require('./models');
const { proPublicaBillToMongo, getCosponsorsFor, getRecentlyEnactedBills,
    addMultipleBills, searchForBill, serializeBill } = require('./bill-utils');

const router = express.Router();

router.get('/recent', (req, res) => {
    // return list of recent bills fro ProPublica
    // if bills not in db, add them
    let billsToReturn;
    return getRecentlyEnactedBills()
        .then(proPubRes => {
            if (proPubRes.status === 'ERROR') {
                return Promise.reject({
                    code: 500,
                    message: 'error retrieving data from propublica'
                })
            }
            return proPubRes.json()
        })
        .then(proPubRes => {
            const bills = proPubRes.results[0].bills;
            billsToReturn = bills.map(bill => serializeBill(proPublicaBillToMongo(bill)));
            return addMultipleBills(billsToReturn)
        })
        .then(() => res.status(200).json({bills: billsToReturn}))
        .catch(err => {
            console.error(err);
            return res.status(500).json({message: 'Error retrieving recent bills'})
        })
});

router.get('/search', (req, res) => {
    const query = req.query.term;
    if (!query) {
        return res.status(422).json({
            code: 422,
            status: 422,
            reason: 'MissingSearchTerm',
            message: 'term query is required'
        })
    }
    let billsToReturn;
    return searchForBill(query)
        .then(proPubRes => {
            if (proPubRes.status === 'ERROR') {
                return Promise.reject({
                    code: 500,
                    message: 'error retrieving data from propublica'
                })
            }
            return proPubRes.json()
        })
        .then(proPubRes => {
            const bills = proPubRes.results[0].bills;
            billsToReturn = bills.map(bill => serializeBill(proPublicaBillToMongo(bill)));
            return addMultipleBills(billsToReturn)
        })
        .then(() => res.status(200).json({bills: billsToReturn}))
        .catch(err => {
            console.error(err);
            return res.status(500).json({message: 'Error searhing for bills'})
        })
});

router.get('/:id', (req, res) => {
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

module.exports = router;