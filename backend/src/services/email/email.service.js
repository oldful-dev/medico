// ──────────────────────────────────────────────
//  Email Service — ZeptoMail delivery layer
//
//  Handles: preference checks, delivery, notification log.
//  Never called directly from controllers — use router.js named functions.
// ──────────────────────────────────────────────

const { SendMailClient } = require('zeptomail');
const { logger } = require('../../config/logger');
const prisma = require('../../config/database');

const ZEPTOMAIL_URL = 'https://api.zeptomail.in/v1.1/email';
const ZEPTOMAIL_TOKEN = process.env.ZEPTOMAIL_API_KEY;
const SENDER_EMAIL = process.env.ZEPTOMAIL_SENDER_EMAIL || 'noreply@ayuxacare.com';
const SENDER_NAME = process.env.ZEPTOMAIL_SENDER_NAME || 'Ayuxa Care';

let _client = null;

const getClient = () => {
    if (!_client && ZEPTOMAIL_TOKEN) {
        _client = new SendMailClient({ url: ZEPTOMAIL_URL, token: ZEPTOMAIL_TOKEN });
    }
    return _client;
};

/**
 * Core send function.
 * @param {Object} opts
 * @param {string} opts.to           - Recipient email address
 * @param {string} opts.subject      - Email subject
 * @param {string} opts.html         - Full HTML body
 * @param {string} [opts.userId]     - Prisma user id (for preference check + log)
 * @param {boolean} [opts.isMarketing=false] - If true, respects emailMarketingEnabled preference
 */
const sendEmail = async ({ to, subject, html, userId = null, isMarketing = false }) => {
    // ── Preference gate ──────────────────────
    if (userId) {
        try {
            const user = await prisma.user.findUnique({
                where: { id: userId },
                select: { emailMarketingEnabled: true },
            });
            if (isMarketing && user && !user.emailMarketingEnabled) {
                logger.info(`📧 Skipping marketing email to ${to} (unsubscribed)`);
                return false;
            }
        } catch (prefErr) {
            logger.warn('Email preference check failed (non-fatal):', prefErr.message);
        }
    }

    let success = false;
    let errorMessage = null;
    const client = getClient();

    // ── Delivery ──────────────────────────────
    if (!client) {
        logger.warn(`📧 [DEV] No ZEPTOMAIL_API_KEY — simulating email to ${to}: ${subject}`);
        success = true;
    } else {
        try {
            await client.sendMail({
                from: { address: SENDER_EMAIL, name: SENDER_NAME },
                to: [{ email_address: { address: to, name: to.split('@')[0] } }],
                subject,
                htmlbody: html,
            });
            success = true;
            logger.info(`📧 Email sent to ${to}: ${subject}`);
        } catch (err) {
            errorMessage = err?.message || String(err);
            logger.error(`📧 ZeptoMail error for ${to}: ${errorMessage}`);
        }
    }

    // ── Notification log ──────────────────────
    await prisma.notificationLog.create({
        data: {
            channel: 'EMAIL',
            recipientId: userId,
            recipientType: userId ? 'user' : 'anonymous',
            subject,
            body: html,
            isSent: success,
            sentAt: success ? new Date() : null,
            errorMessage: success ? null : (errorMessage || 'ZeptoMail failed'),
        },
    }).catch(logErr => logger.warn('Email notification log failed:', logErr.message));

    return success;
};

module.exports = { sendEmail };
