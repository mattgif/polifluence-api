const mongoose = require('mongoose');

const BillSchema = new mongoose.Schema({
    bill_id: {
        type: String,
        required: true
    },
    number: {
        type: String,
        required: true
    },
    title: {
        type: String,
        required: true
    },
    shortTitle: String,
    sponsor: String,
    cosponsors: Array,
    introducedDate: String,
    enacted: Boolean,
    housePassage: String,
    senatePassage: String,
    summary: String,
    summaryShort: String,
    lastUpdated: {
        type: Date,
        required: true,
        default: Date.now
    }
});

BillSchema.methods.serialize = function() {
    return {
        id: this.bill_id,
        number: this.number,
        title: this.title,
        shortTitle: this.shortTitle,
        sponsor: this.sponsor,
        cosponsors: this.cosponsors,
        introducedDate: this.introducedDate,
        enacted: this.enacted,
        housePassage: this.housePassage,
        senatePassage: this.senatePassage,
        summary: this.summary,
        summaryShort: this.summaryShort,
    }
};

const Bill = mongoose.model('Bill', BillSchema);

module.exports = { Bill };
