const mongoose = require('mongoose');

const MemberSchema = new mongoose.Schema({
    firstName: {
        type: String,
        required: true
    },
    lastName: {
        type: String,
        required: true
    },
    shortTitle: String,
    chamber: String,
    title: String,
    party: String,
    state: String,
    crpId: String,
    memberId: {
        type: String,
        unique: true
    },
    website: String,
    nextElection: String,
    billsSponsored: Array,
    billsCosponsored: Array,
    portrait: String,
    topContributors: Array,
    topIndustries: Array,
    lastUpdated: {
        type: Date,
        required: true,
        default: Date.now
    }
});

MemberSchema.methods.serialize = function() {
    return {
        firstName: this.firstName,
        lastName: this.lastName,
        shortTitle: this.shortTitle,
        chamber: this.chamber,
        nextElection: this.nextElection,
        title: this.title,
        party: this.party,
        state: this.state,
        crpId: this.crpId,
        memberId: this.memberId,
        website: this.website,
        billsSponsored: this.billsSponsored,
        billsCosponsored: this.billsCosponsored,
        portrait: this.portrait,
        topContributors: this.topContributors
    }
};

const Member = mongoose.model('Member', MemberSchema);

module.exports = { Member };
