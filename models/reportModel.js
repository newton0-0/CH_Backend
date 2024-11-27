const mongoose = require('mongoose');

const reportSchema = new mongoose.Schema({
    tenders: [{
        tenderId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Tender',
            required: true
        },
        ratings: [{
            attribute: {
                type: String,
                required: true
            },
            rating: {
                type: Number,
                min: 1,
                max: 5
            }
        }]
    }],
    remarks: {
        type: String,
    },
    status: {
        type: String,
        enum: ['pending', 'approved', 'rejected', 'requested', 'completed'],
        default: 'pending'
    },
    submittedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    submittedTo: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: false
    }
}, {
    timestamps: true
});

const Report = mongoose.model('Report', reportSchema);
module.exports = Report;