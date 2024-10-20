const mongoose = require('mongoose');

// Define a Mongoose schema
const tenderSchema = new mongoose.Schema({
    tender_reference_number: {
        type: String,
        required: true,
        unique: true
    },
    tender_id: {
        type: String,
        required: true,
        unique: true
    },
    tender_title: {
        type: String,
        required: true
    },
    bid_submission_end_date: {
        type: Date,
        required: true
    },
    tender_url: {
        type: String,
        required: true,
        unique : true
    }
}, { timestamps: true });

// Create a Mongoose model
const Tender = mongoose.model('Tender', tenderSchema, 'Tender'); // Specify the collection name explicitly
module.exports = Tender;