// ──────────────────────────────────────────────
//  Email Service — ZeptoMail delivery layer
//
//  Handles: preference checks, delivery, notification log.
//  Never called directly from controllers — use router.js named functions.
// ──────────────────────────────────────────────

const { logger } = require('../../config/logger');
const prisma = require('../../config/database');

const ZEPTOMAIL_URL = 'https://api.zeptomail.in/v1.1/email';
const ZEPTOMAIL_TOKEN = process.env.ZEPTOMAIL_API_KEY;
const SENDER_EMAIL = process.env.ZEPTOMAIL_SENDER_EMAIL || 'noreply@ayuxacare.com';
const SENDER_NAME = process.env.ZEPTOMAIL_SENDER_NAME || 'Ayuxa Platforms';

// Calls the ZeptoMail HTTP API directly instead of using the `zeptomail` SDK.
// The SDK's request builder never sets Content-Type: application/json (only
// Authorization — see node_modules/zeptomail/lib/js/init.js Client.getHeader),
// which was silently corrupting PDF attachments in transit — the attachment
// bytes arrived garbled even though ZeptoMail still returned 201/EM_104.
// Confirmed fixed by sending the identical payload with an explicit
// Content-Type header via plain fetch.
const sendViaZeptoMail = async (body) => {
    const res = await fetch(ZEPTOMAIL_URL, {
        method: 'POST',
        headers: {
            Authorization: ZEPTOMAIL_TOKEN,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
    });
    const json = await res.json().catch(() => null);
    if (!res.ok) {
        throw new Error(json ? JSON.stringify(json) : `ZeptoMail request failed with status ${res.status}`);
    }
    return json;
};

/**
 * Core send function.
 * @param {Object} opts
 * @param {string} opts.to           - Recipient email address
 * @param {string} opts.subject      - Email subject
 * @param {string} opts.html         - Full HTML body
 * @param {string} [opts.userId]     - Prisma user id (for preference check + log)
 * @param {boolean} [opts.isMarketing=false] - If true, respects emailMarketingEnabled preference
 * @param {Array<{content: Buffer, mimeType: string, name: string}>} [opts.attachments]
 */
const sendEmail = async ({ to, subject, html, userId = null, isMarketing = false, attachments = [] }) => {
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

    // ── Delivery ──────────────────────────────
    if (!ZEPTOMAIL_TOKEN) {
        logger.warn(`📧 [DEV] No ZEPTOMAIL_API_KEY — simulating email to ${to}: ${subject}`);
        success = true;
    } else {
        try {
            await sendViaZeptoMail({
                from: { address: SENDER_EMAIL, name: SENDER_NAME },
                to: [{ email_address: { address: to, name: to.split('@')[0] } }],
                subject,
                htmlbody: html,
                ...(attachments.length > 0 && {
                    attachments: attachments.map(a => ({
                        content: a.content.toString('base64'),
                        mime_type: a.mimeType,
                        name: a.name,
                    })),
                }),
            });
            success = true;
            logger.info(`📧 Email sent to ${to}: ${subject}`);
        } catch (err) {
            errorMessage = typeof err === 'object' ? JSON.stringify(err) : (err?.message || String(err));
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
