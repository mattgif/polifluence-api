const express = require('express');
const { Bill } = require('./models');
const { proPublicaBillToMongo, getCosponsorsFor, getRecentlyEnactedBills,
    addMultipleBills, searchForBill, serializeBill, getSpecificBill, ageInDays } = require('./bill-utils');

const router = express.Router();
const MAX_BILL_AGE_BEFORE_UPDATE = 5; // age of bills (in days) before getting updated info

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
            const billsToAdd = bills.map(bill => proPublicaBillToMongo(bill));
            billsToReturn = billsToAdd.map(bill => serializeBill(bill));
            return addMultipleBills(billsToAdd)
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
            const billsToAdd = bills.map(bill => proPublicaBillToMongo(bill));
            billsToReturn = billsToAdd.map(bill => serializeBill(bill));
            return addMultipleBills(billsToAdd)
        })
        .then(() => res.status(200).json({bills: billsToReturn}))
        .catch(err => {
            console.error(err);
            return res.status(500).json({message: 'Error searching for bills'})
        })
});

router.get('/:id', (req, res) => {
    // get specific bill by its billId
    // if it's not in the dB, or data is > 5 days old, grab it from propub, add to dB and return it
    // if it's in dB, but lacks cosponsor info, try to get cosponsor info from proPub, updated dB and return
    return Bill.findOne({billId: req.params.id})
        .then(bill => {
            if (!bill || (ageInDays(bill.lastUpdated) >= MAX_BILL_AGE_BEFORE_UPDATE) ) {
                // bill not in db or data > 5 days old
                return getSpecificBill(req.params.id)
                    .then((billToReturn) => res.status(200).json(billToReturn))
                    .catch(err => {
                        return Promise.reject({
                            code: 500,
                            message: 'error retrieving data from propublica'
                        })
                    })
            }
            else if (!bill.cosponsors || bill.cosponsors.length < 1) {
                // bill in dB, but no cosponsor info
                return getCosponsorsFor(bill.billId)
                    .then(proPubRes => {
                        if (proPubRes.status === 'ERROR') {
                            return Promise.reject({
                                code: 500,
                                message: 'error retrieving data from propublica'
                            })
                        } else {
                            return proPubRes.json()
                        }
                    })
                    .then(proPubJSON => {
                        bill.cosponsors = proPubJSON.results[0].cosponsors.map(cosponsor => cosponsor.cosponsor_id)
                        return bill.save()
                            .then(bill => res.status(200).json(bill.serialize()))
                    })
            }

            else {
                // found bill, all is well
                return res.status(200).json(bill.serialize())
            }
        })
        .catch(err => {
            console.error(err);
            return res.status(404).json('Resource not found on ProPublica') // no data found, no reason to bug the client
        })
});

module.exports = router;