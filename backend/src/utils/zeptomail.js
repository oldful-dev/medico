// ──────────────────────────────────────────────
//  ZeptoMail Utility
//  Handles Transactional Emails
// ──────────────────────────────────────────────

const { SendMailClient } = require("zeptomail");
const { logger } = require('../config/logger');

const url = "https://api.zeptomail.in/v1.1/email";
const token = process.env.ZEPTOMAIL_API_KEY;


let client;
if (token) {
    client = new SendMailClient({ url, token });
}

/**
 * Send Transactional Email via ZeptoMail
 */
const sendEmail = async ({ to, subject, html, templateId, variables }) => {
    try {
        if (!client) {
            logger.warn('ZEPTOMAIL_API_KEY not set. Simulating email send.');
            return true;
        }

        const emailData = {
            "from": {
                "address": process.env.ZEPTOMAIL_SENDER_EMAIL || "notifications@oldful.com",
                "name": process.env.ZEPTOMAIL_SENDER_NAME || "Oldful Healthcare"
            },
            "to": [
                {
                    "email_address": {
                        "address": to,
                        "name": to.split('@')[0]
                    }
                }
            ],
            "subject": subject,
        };

        if (templateId) {
            emailData.template_key = templateId;
            emailData.merge_info = variables;
        } else {
            emailData.htmlbody = html;
        }

        await client.sendMail(emailData);
        logger.info(`📧 ZeptoMail sent to ${to}: ${subject}`);
        return true;
    } catch (error) {
        logger.error('ZeptoMail Error:', error);
        return false;
    }
};

module.exports = {
    sendEmail,
};
