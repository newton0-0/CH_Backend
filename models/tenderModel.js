const mongoose = require('mongoose');

// Define a Mongoose schema
const tenderSchema = new mongoose.Schema({
    tender_reference_number: {
        type: [String, "Tender reference number is supposed to be a string"],
        required: [true, "Tender reference number is required"],
        unique: [true, "Tender with same ref no. already exists"]
    },
    tender_id: {
        type: [String, "Tender id is supposed to be a string"],
        required: [true, "Tender id is required"],
        unique: [true, "Tender with same id already exists"]
    },
    tender_title: {
        type: [String, "Tender title is supposed to be a string"],
        required: [true, "Tender title is required"],
    },
    bid_submission_end_date: {
        type: [Date, "Bid submission end date is supposed to be a date"],
        required: [true, "Bid submission end date is required"],
    },
    tender_url: {
        type: [String, "Tender url is supposed to be a string"],
        required: [true, "Tender url is required"],
        unique : [true, "Tender with same url already exists"]
    }
}, { timestamps: true });

// Create a Mongoose model
const Tender = mongoose.model('Tender', tenderSchema, 'Tender'); // Specify the collection name explicitly
module.exports = Tender;