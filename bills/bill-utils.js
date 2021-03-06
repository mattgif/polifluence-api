'use strict';
const fetch = require('node-fetch');
const {Bill} = require('./models');
const { PROPUBLICA_API_KEY } = require('../config');

const PROPUBLICA_BASE_API = 'https://api.propublica.org/congress/v1';
const UPDATEABLE_FIELDS = ['enacted', 'housePassage', 'senatePassage'];

function serializeBill(bill) {
    // formats bill as it would be returned from mongo with .serialize()
    // used for returning results from ProPub without having to wait for Db queries
    return {
        id: bill.billId,
        number: bill.number,
        title: bill.title,
        shortTitle: bill.shortTitle,
        sponsor: bill.sponsor,
        cosponsors: bill.cosponsors,
        introducedDate: bill.introducedDate,
        enacted: bill.enacted,
        housePassage: bill.housePassage,
        senatePassage: bill.senatePassage,
        subject: bill.subject,
        summary: bill.summary,
        summaryShort: bill.summaryShort,
    }
}

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
    // takes array of mongoformatted bills and adds to db
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
                .then(bill => getCosponsorsFor(bill.billId))
        })
}

function searchForBill(query) {
    // returns Propublica response for keyword query on bill
    return fetch(`${PROPUBLICA_BASE_API}/bills/search.json?query=${query}`, {
        method: 'GET',
        headers: {
            'X-API-Key': PROPUBLICA_API_KEY
        }
    })
}

function getSpecificBill(_billId) {
    const billId = _billId.slice(0,_billId.length-4);
    let billToReturn;
    // returns ProPublica bill object
    return fetch(`${PROPUBLICA_BASE_API}/115/bills/${billId}.json`, {
        method: 'GET',
        headers: {
            'X-API-Key': PROPUBLICA_API_KEY
        }
    })
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
            if (!proPubRes.results) {
                return Promise.reject({
                    code: 500,
                    message: 'error retrieving data from propublica'
                })
            }
            const foundBill = proPubRes.results[0];
            const billToAdd = proPublicaBillToMongo(foundBill);
            billToReturn = serializeBill(billToAdd);
            return addBill(billToAdd)
        })
        .then(() => billToReturn);
}

function ageInDays(lastUpdated) {
    // calculates difference in days between given date and now
    const today = Date.now();
    return Math.round(Math.abs(today - lastUpdated) / 8.64e7)
}

module.exports = { ageInDays, proPublicaBillToMongo, getCosponsorsFor, getRecentlyEnactedBills,
    addMultipleBills, serializeBill, searchForBill, getSpecificBill };