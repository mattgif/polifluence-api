const express = require('express');
const { Member } = require('./models');
const { Bill } = require('../bills/models');
const { fetchSpecificMember, addMember, fetchIndustryDataFromOpenSecrets, fetchContributorDataFromOpenSecrets } = require('./member-utils');

const router = express.Router();
const MAX_MEMBER_OBJECT_AGE = 30; // age of member object in days before update

function ageInDays(lastUpdated) {
    // calculates difference in days between given date and now
    const today = Date.now();
    return Math.round(Math.abs(today - lastUpdated) / 8.64e7)
}

router.get('/', (req, res) => {
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

router.get('/:memberId', (req, res) => {
    // get specific member
    return Member.findOne({memberId: req.params.memberId })
        .then(member => {
            if (!member || ageInDays(member.lastUpdated) > MAX_MEMBER_OBJECT_AGE) {
                return fetchSpecificMember(req.params.memberId)
                    .then(proPublicaResult => {
                        return addMember(proPublicaResult)
                    })
                    .then(member => res.status(200).json(member.serialize()))
            }
            return res.status(200).json(member.serialize())
        })
        .catch(err => {
            console.error(err);
            res.status(500).json('Unexpected error retrieving data');
        });
});

router.get('/:crpId/contributions', (req, res) => {
    const crpId = req.params.crpId;
    let topContributors, topIndustries;
    return fetchContributorDataFromOpenSecrets(crpId)
        .then(contribData => {
            topContributors = contribData;
            return fetchIndustryDataFromOpenSecrets(crpId)
        })
        .then(indusData => {
            topIndustries = indusData;
            return Member.findOne({ crpId })
        })
        .then(member => {
            member.topContributors = topContributors;
            member.topIndustries = topIndustries;
            return member.save()
        })
        .then(member => res.status(200).json(member))
        .catch(() => res.status(500).json('Error retrieving finance data from OpenSecrets'))
});

router.get('/:memberId/bills', (req, res) => {
    // return all bills sponsored and cosponsored by member with memberId
    return Member.findOne({ memberId: req.params.memberId })
        .then(member => {
            const { billsSponsored, billsCosponsored } = member;
            const queryParams = { billId: { $in: [...billsSponsored, ...billsCosponsored] } };
            return Bill.find(queryParams)
                .then(_bills => {
                    const bills = _bills.map(bill => bill.serialize());
                    res.status(200).json({bills})
                })
        })
        .catch(err => {
            console.error(err);
            return res.status(500).json({message: 'Could not find bills for specified member'})
        })
});

module.exports = router;