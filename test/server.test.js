const chai = require('chai');
const chaiHttp = require('chai-http');
const { app, runServer, closeServer } = require('../server');
const { TEST_DATABASE_URL } = require('../config');
const { Member } = require('../members/models');

const should = chai.should();
chai.use(chaiHttp);

const MEMBER_COUNT = 5;

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

describe('API', function() {
    before(function() {
        return runServer(TEST_DATABASE_URL);
    });

    beforeEach(function() {return seedMemberDb()});

    afterEach(function() {return Member.remove()});

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

    it('should 200 on GET to /api/members/:id for specifc member', function() {
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
});