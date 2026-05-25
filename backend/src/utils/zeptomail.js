// ──────────────────────────────────────────────
//  ZeptoMail Utility — legacy shim
//  Delegates to services/email/email.service.js
//  Kept for any direct require('../utils/zeptomail') callers.
// ──────────────────────────────────────────────

const { sendEmail } = require('../services/email/email.service');

module.exports = { sendEmail };
