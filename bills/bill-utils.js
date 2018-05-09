'use strict';
const fetch = require('node-fetch');
const {Bill} = require('./models');
const { PROPUBLICA_API_KEY } = require('../config');

const PROPUBLICA_BASE_API = 'https://api.propublica.org/congress/v1';
const UPDATEABLE_FIELDS = ['enacted', 'housePassage', 'senatePassage'];

function proPublicaBillToMongo(bill) {
    return {
        billId: bill.bill_id,
        number: bill.number,
        title: bill.title,
        shortTitle: bill.short_title,
        sponsor: bill.sponsor_id,
        introducedDate: bill.introduced_date,
        enacted: bill.enacted,
        housePassage: bill.house_passage,
        senatePassage: bill.senate__passage,
        summary: bill.summary,
        summaryShort: bill.summary_short,
        subject: bill.primary_subject,
        lastUpdated: Date.now()
    }
}

function getCosponsorsFor(_billId) {
    // Retrieves list of cosponsors from propublica
    // ProPublica wants a bill id w/o congress, so hr4533-115 should become hr4533
    const billId = _billId.slice(0,(_billId.length-4));
    return fetch(`${PROPUBLICA_BASE_API}/115/bills/${billId}/cosponsors.json`, {
        method: 'GET',
        headers: {
            'X-API-Key': PROPUBLICA_API_KEY
        }
    })
        .catch(err => {
            console.error('getCosponsorsFor error', err);
            return Promise.reject({message: 'woops'});
        })
}

function getRecentlyEnactedBills() {
    // Fetches recent bills from propublica, returns array of bills
    return fetch(`${PROPUBLICA_BASE_API}/115/both/bills/enacted.json`, {
        method: 'GET',
        headers: {
            'X-API-Key': PROPUBLICA_API_KEY
        }
    })
}

function addMultipleBills(billArray) {
    console.log(billArray);
    return Promise.all(billArray.map(bill => addBill(bill)))
}

function addBill(billToAdd) {
    // takes a mongo formatted bill and checks if it's in the database. if it isn't, it's added
    // if it is, it updates updatable fields
    return Bill.findOne( { billId: billToAdd.billId } )
        .then(bill => {
            if (bill) {
                // bill exists, update
                UPDATEABLE_FIELDS.forEach(field => {
                    bill[field] = billToAdd[field]
                });
                bill.lastUpdated = Date.now();
                return bill.save()
            }
            return Bill.create(billToAdd)
        })
}

module.exports = { proPublicaBillToMongo, getCosponsorsFor, getRecentlyEnactedBills, addMultipleBills, addBill };