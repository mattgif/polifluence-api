const chai = require('chai');
const chaiHttp = require('chai-http');
const { app, runServer, closeServer } = require('../server');
const { TEST_DATABASE_URL } = require('../config');
const { Member } = require('../members/models');
const { Bill } = require('../bills/models');

const should = chai.should();
chai.use(chaiHttp);

const MEMBER_COUNT = 5;
const BILL_COUNT = 5;
const BILL_IDS = ['hr5670-115', 'hres413-115', 'hr845-115', 'hconres28-115', 'hr2983-115'];

function seedMemberDb() {
    const members = [];
    for (let i = 0; i < MEMBER_COUNT; i++) {
        members.push({
            firstName: 'a' + i,
            lastName: 'last' + i,
            shortTitle: 'short' + i,
            chamber: 'chamber' + i,
            party: 'party' + i,
            crpId: 'crp' + i,
            memberId: 'member' + i,
            portrait: 'portrait',
            state: 'state',
            title: 'title'
        })
    }
    return Member.insertMany(members)
}

function seedBillDb() {
    const bills = [];
    for (let i = 0; i < BILL_COUNT; i++) {
        bills.push({
            billId: BILL_IDS[i],
            number: i,
            title: 'asdfasdf'
        })
    }
    return Bill.insertMany(bills);
}

describe('API', function() {
    before(function() {
        return runServer(TEST_DATABASE_URL);
    });

    beforeEach(function() {
        return seedMemberDb()
            .then(() => seedBillDb())
    });

    afterEach(function() {return Member.remove().then(() => Bill.remove())});

    after(function() {
        return(closeServer())
    });

    it('should 200 on GET request to /api/members', function() {
        return chai.request(app)
            .get('/api/members')
            .then(function(res) {
                res.should.have.status(200);
                res.should.be.json;
                res.body.should.be.an('array');
                res.body[0].should.be.an('object');
                res.body[0].should.include.all.keys('firstName', 'lastName', 'title',
                    'party', 'memberId', 'state', 'portrait', 'billsSponsored',
                    'billsCosponsored', 'chamber' , 'crpId', 'shortTitle', 'topContributors')
            });
    });

    it('should 200 on GET to /api/members/:id for specific member', function() {
       return chai.request(app)
           .get('/api/members/member0')
           .then(function(res) {
               res.should.have.status(200);
               res.should.be.json;
               res.body.should.be.an('object');
               res.body.should.include.all.keys('firstName', 'lastName', 'title',
                   'party', 'memberId', 'state', 'portrait', 'billsSponsored',
                   'billsCosponsored', 'chamber' , 'crpId', 'shortTitle', 'topContributors')
           })
    });

    it('should return 200 on GET to /api/bills/:id for specific bill', function() {
        return chai.request(app)
            .get(`/api/bills/${BILL_IDS[0]}`)
            .then(function(res) {
                res.should.have.status(200);
                res.should.be.json;
                res.body.should.be.an('object');
            })
    });

    it('should return an array of bills sponsored and cosponsored by member', function() {
        const memberId = 'testid123'
        const member = {
            firstName: 'Jane',
            lastName: 'Doe',
            shortTitle: 'asdf',
            chamber: 'asdf',
            party: 'asdf',
            crpId: 'asdf',
            memberId,
            portrait: 'portrait',
            state: 'state',
            title: 'title',
            billsSponsored: BILL_IDS
        };

        Member.create({ member })
            .then(() => {
                return chai.request(app)
                    .get(`/api/members/${memberId}/bills`)
                    .then(res => {
                        expect.res.to.be.json;
                        res.body.should.be.an('array')
                    })
            });
    })
});