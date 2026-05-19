// ──────────────────────────────────────────────
//  SMS Service — public exports
// ──────────────────────────────────────────────

const { sendSMS } = require('./sms.service');
const { SMS_TEMPLATES } = require('./templates');

module.exports = { sendSMS, SMS_TEMPLATES };
