'use strict';

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

module.exports = { proPublicaBillToMongo };