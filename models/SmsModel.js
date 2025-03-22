const mongoose = require('mongoose');

const smsSchema = new mongoose.Schema({
    "to": String
}, { strict: false });

const SmsModel = mongoose.model('Sms', smsSchema);

module.exports = SmsModel;