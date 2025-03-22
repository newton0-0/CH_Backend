const mongoose = require('mongoose');

const smsSchema = new mongoose.Schema({
    "message": String
}, { strict: false });

const SmsModel = mongoose.model('Sms', smsSchema);

module.exports = SmsModel;