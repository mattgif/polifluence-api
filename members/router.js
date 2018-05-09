const express = require('express');
const { Member } = require('./models');
const { Bill } = require('../bills/models');

const router = express.Router();

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
        .then(member => res.status(200).json(member.serialize()))
        .catch(err => {
            console.error(err);
            res.status(500).json('Unexpected error retrieving data');
        });
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