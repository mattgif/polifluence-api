'use strict';
const fetch = require('node-fetch');
const { PROPUBLICA_API_KEY } = require('../config');

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
    return fetch(`https://api.propublica.org/congress/v1/115/bills/${billId}/cosponsors.json`, {
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

module.exports = { proPublicaBillToMongo, getCosponsorsFor };