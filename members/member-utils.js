'use strict';
const fetch = require('node-fetch');
const {Member} = require('./models');
const { PROPUBLICA_API_KEY } = require('../config');
const { proPublicaBillToMongo, addMultipleBills } = require('../bills/bill-utils');

const PROPUBLICA_BASE_API = 'https://api.propublica.org/congress/v1';

function fetchSpecificMember(memberId) {
    return fetch(`${PROPUBLICA_BASE_API}/members/${memberId}.json`, {
        method: 'GET',
        headers: {
            'X-API-Key': PROPUBLICA_API_KEY
        }
    })
        .then(res => res.json())
        .then(res => {
            if (!res.results) {
                return Promise.reject({
                    code: 404,
                    message: 'Error retrieving data from propublica'
                })
            }
            return res.results[0]
        })
}

function addMember(proPublicaMemberResult) {
    // add member to dB, get recent bills, add bills to dB, updated sponsored bills and cosponsored bills
    const billsSponsored = [];
    const billsCosponsored = [];
    let memberId;
    const memberToAdd = proPublicaMemberToMongo(proPublicaMemberResult);
    const updateableFields = ['shortTitle', 'chamber', 'title', 'party', 'lastUpdated'];
    return Member.findOne({ memberId: memberToAdd.memberId })
        .then(member => {
            if (!member) {
                return Member.create(memberToAdd)
                    .then(member => {
                        memberId = member.memberId;
                        return member;
                    });
            }
            updateableFields.forEach(field => {
                member[field] = memberToAdd[field]
            });
            memberId = member.memberId;
            return member.save()
        })
        .then(() => getRecentBillsByMember(memberId))
        .then(proPubBills => {
            const billsToAdd = proPubBills.map(bill => proPublicaBillToMongo(bill));
            billsToAdd.forEach(bill => billsSponsored.push(bill.billId));
            return addMultipleBills(billsToAdd);
        })
        .then(() => {
            return getRecentBillsCosponsoredByMember(memberId)
        })
        .then(proPubBills => {
            const billsToAdd = proPubBills.map(bill => proPublicaBillToMongo(bill));
            billsToAdd.forEach(bill => billsCosponsored.push(bill.billId));
            return addMultipleBills(billsToAdd);
        })
        .then(() => Member.findOne({memberId}))
        .then(member => {
            const updatedBillsSponsored = removeDuplicates(member.billsSponsored.concat(billsSponsored));
            const updatedBillsCosponsored = removeDuplicates(member.billsCosponsored.concat(billsCosponsored));
            member.billsSponsored = updatedBillsSponsored;
            member.billsCosponsored = updatedBillsCosponsored;
            return member.save()
        })
}

function removeDuplicates(arr){
    return arr.filter(function (elem, index, self) {
        return index === self.indexOf(elem);
    })
}

function getRecentBillsByMember(memberId) {
    return fetch(`${PROPUBLICA_BASE_API}/members/${memberId}/bills/introduced.json`, {
        method: 'GET',
        headers: {
            'X-API-Key': PROPUBLICA_API_KEY
        }
    })
        .then(res => res.json())
        .then(res => {
            if (!res.results) {
                return Promise.reject({
                    code: 404,
                    message: `Error retrieving bills sponsored by ${memberId} from Propublica`
                })
            }
            return res.results[0].bills;
        })
}

function getRecentBillsCosponsoredByMember(memberId) {
    return fetch(`${PROPUBLICA_BASE_API}/members/${memberId}/bills/cosponsored.json`, {
        method: 'GET',
        headers: {
            'X-API-Key': PROPUBLICA_API_KEY
        }
    })
        .then(res => res.json())
        .then(res => {
            if (!res.results) {
                return Promise.reject({
                    code: 404,
                    message: `Error retrieving bills cosponsored by ${memberId} from Propublica`
                })
            }
            return res.results[0].bills;
        })
}

function proPublicaMemberToMongo(member) {
    return {
        firstName: member.first_name,
        lastName: member.last_name,
        shortTitle: member.roles.short_title || member.short_title,
        chamber: member.roles.chamber || member.chamber,
        title: member.roles.title || member.title,
        party: member.roles.part || member.party,
        state: member.roles.state || member.state,
        crpId: member.crp_id,
        memberId: member.member_id,
        website: member.url,
        nextElection: member.nextElection,
        portrait: `https://theunitedstates.io/images/congress/225x275/${member.member_id}.jpg`,
        lastUpdated: Date.now()
    }
}

module.exports = { fetchSpecificMember, proPublicaMemberToMongo, addMember };