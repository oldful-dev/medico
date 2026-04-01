// ──────────────────────────────────────────────
//  Notification Service (Email + WhatsApp + Push)
//
//  Channel routing:
//    WhatsApp → Interakt (interakt.service.js)
//    SMS/OTP  → Fast2SMS (fast2sms.js)  ← unchanged
//    Email    → ZeptoMail (zeptomail.js)
//    Push     → FCM (pushNotification.service.js)
// ──────────────────────────────────────────────

const { logger } = require('../config/logger');
const prisma = require('../config/database');

// ─── Email (ZeptoMail) ──────────────────────

const zeptoMail = require('./zeptomail');

const sendEmail = async ({ to, subject, html, attachments = [], userId = null }) => {
    try {
        const success = await zeptoMail.sendEmail({ to, subject, html });

        if (success) {
            logger.info(`📧 Email sent to ${to}: ${subject}`);
        }

        await prisma.notificationLog.create({
            data: {
                channel: 'EMAIL',
                recipientId: userId,
                recipientType: userId ? 'user' : 'user',
                subject,
                body: html,
                isSent: success,
                sentAt: success ? new Date() : null,
                errorMessage: success ? null : 'ZeptoMail failed',
            },
        });

        return success;
    } catch (error) {
        logger.error('Email send error:', error);
        return false;
    }
};

// ─── WhatsApp (Interakt) ───────────────────
// Fast2SMS WhatsApp has been replaced.
// SMS/OTP from Fast2SMS is untouched below.

const interakt = require('../services/interakt.service');
const fast2sms = require('./fast2sms');

/**
 * Send a WhatsApp template message via Interakt.
 * Signature is backward-compatible with the old Fast2SMS wrapper —
 * callers that pass `parameters` (array) continue to work.
 *
 * @param {object} opts
 * @param {string}   opts.phoneNumber   - Recipient phone
 * @param {string}   opts.templateName  - Interakt template name
 * @param {string[]|object[]} opts.parameters - Template body variables
 * @param {string}   [opts.userId]      - For notification log
 */
const sendWhatsApp = async ({ phoneNumber, templateName, parameters = [], userId = null }) => {
    // Normalise parameters: support both old array-of-strings and
    // object array formats ({ name, value }) used in payment controller
    const variables = parameters.map(p =>
        typeof p === 'object' && p !== null && 'value' in p ? p.value : String(p)
    );

    let success = false;
    let errorMessage = null;

    try {
        success = await interakt.sendWhatsAppMessage({
            phone: phoneNumber,
            templateName,
            variables,
        });

        if (!success) {
            // Fallback to Fast2SMS SMS if Interakt fails and a DLT template is available
            logger.warn(`[Notifications] Interakt failed for ${templateName} — attempting SMS fallback`);
            const fallbackTemplateId = process.env[`FAST2SMS_${templateName.toUpperCase()}_TEMPLATE_ID`];
            if (fallbackTemplateId) {
                const smsSent = await fast2sms.sendDLTSMS(phoneNumber, fallbackTemplateId, variables);
                if (smsSent) {
                    logger.info(`[Notifications] SMS fallback succeeded for ${templateName}`);
                    success = true;
                    errorMessage = 'Interakt failed; delivered via SMS fallback';
                } else {
                    errorMessage = 'Interakt failed; SMS fallback also failed';
                }
            } else {
                errorMessage = 'Interakt failed; no SMS fallback configured';
            }
        }
    } catch (error) {
        logger.error('WhatsApp send error:', error);
        errorMessage = error.message;
    }

    await prisma.notificationLog.create({
        data: {
            channel: 'WHATSAPP',
            recipientId: userId,
            recipientType: userId ? 'user' : 'user',
            body: `Template: ${templateName}, Params: ${JSON.stringify(variables)}`,
            isSent: success,
            sentAt: success ? new Date() : null,
            errorMessage: errorMessage,
        },
    }).catch(logErr => logger.warn('WhatsApp notification log failed:', logErr.message));

    return success;
};

// ─── Welcome Notifications ─────────────────

const sendWelcomeNotifications = async (user) => {
    // Welcome Email
    await sendEmail({
        to: user.email,
        subject: `Welcome to Oldful, ${user.name}! 🎉`,
        userId: user.id,
        html: `
      <h1>Welcome to Oldful Healthcare!</h1>
      <p>Dear ${user.name},</p>
      <p>Your Oldful ID is: <strong>${user.uniqueUserId}</strong></p>
      <p>You now have access to premium healthcare services at your doorstep.</p>
      <p>Download the Oldful app and start booking services today!</p>
      <p>Best regards,<br>Team Oldful</p>
    `,
    });

    // Welcome WhatsApp (Interakt)
    // Template: oldful_welcome — {{1}}=name (DOCUMENT header)
    await sendWhatsApp({
        phoneNumber: user.phone,
        templateName: 'welcome_message',
        parameters: [user.name],
        userId: user.id,
    });
};

// ─── SOS Notifications ────────────────────

const sendSOSNotifications = async ({ user, location, familyContacts }) => {
    // NOTE: No approved SOS-specific WhatsApp templates exist.
    // SOS alerts are handled via:
    //   1. Direct tel: deep link (client-side)
    //   2. Admin email notification
    //   3. SMS fallback via Fast2SMS (if DLT template configured)

    // Admin — Email alert with location
    await sendEmail({
        to: process.env.ADMIN_EMERGENCY_EMAIL || 'sos@oldful.com',
        subject: `🚨 SOS ALERT — ${user.name} (${user.uniqueUserId})`,
        html: `
      <h1 style="color:red">🚨 SOS Emergency Alert</h1>
      <p><strong>User:</strong> ${user.name} (${user.uniqueUserId})</p>
      <p><strong>Phone:</strong> ${user.phone}</p>
      <p><strong>Location:</strong> ${location || 'Unknown'}</p>
      <p><strong>Time:</strong> ${new Date().toLocaleString('en-IN')}</p>
    `,
    });

    // Admin — SMS fallback
    if (process.env.FAST2SMS_SOS_ADMIN_TEMPLATE_ID) {
        await fast2sms.sendDLTSMS(
            process.env.ADMIN_EMERGENCY_PHONE || '9999999999',
            process.env.FAST2SMS_SOS_ADMIN_TEMPLATE_ID,
            [user.name, user.phone, location || 'Unknown']
        );
    }

    // Family contacts — SMS fallback
    for (const contact of familyContacts) {
        if (process.env.FAST2SMS_SOS_FAMILY_TEMPLATE_ID) {
            await fast2sms.sendDLTSMS(
                contact.phone,
                process.env.FAST2SMS_SOS_FAMILY_TEMPLATE_ID,
                [user.name, contact.name, location || 'Unknown']
            );
        }
    }
};

// ─── Booking Confirmation ─────────────────

const sendBookingConfirmation = async ({ user, bookingCode, booking = null }) => {
    // Primary: WhatsApp via Interakt
    // Template: service_request_ — {{1}}=name {{2}}=service {{3}}=orderId {{4}}=phone {{5}}=email
    await sendWhatsApp({
        phoneNumber: user.phone,
        templateName: 'booking_confirmation',
        parameters: [
            user.name,
            booking?.serviceName || 'your requested service',
            bookingCode || '-',
            '+91 94801 98108',
            'client@oldful.com',
        ],
        userId: user.id,
    });

    // Also send DLT SMS if template is configured (belt-and-suspenders)
    if (process.env.FAST2SMS_ORDER_TEMPLATE_ID) {
        await fast2sms.sendDLTSMS(
            user.phone,
            process.env.FAST2SMS_ORDER_TEMPLATE_ID,
            [user.name, bookingCode, process.env.ADMIN_EMERGENCY_PHONE || '9480198108']
        );
    }
};

// ─── Expiry Reminder ──────────────────────

const sendExpiryReminder = async ({ user, plan, daysLeft, expiryDate }) => {
    await sendEmail({
        to: user.email,
        subject: `Your ${plan.name} plan expires in ${daysLeft} days`,
        userId: user.id,
        html: `
      <h2>Plan Expiry Reminder</h2>
      <p>Dear ${user.name},</p>
      <p>Your <strong>${plan.name}</strong> plan expires on <strong>${new Date(expiryDate).toLocaleDateString('en-IN')}</strong> (${daysLeft} days remaining).</p>
      <p>Renew now to continue enjoying uninterrupted healthcare services.</p>
      <p>Best regards,<br>Team Oldful</p>
    `,
    });

    // Template: renewal_reminder — {{1}}=name {{2}}=planName {{3}}=phone {{4}}=email
    await sendWhatsApp({
        phoneNumber: user.phone,
        templateName: 'plan_expiry_reminder',
        parameters: [
            user.name,
            plan.name || 'Oldful Plan',
            '+91 94801 98108',
            'client@oldful.com',
        ],
        userId: user.id,
    });
};

// ─── OTP (Fast2SMS SMS — unchanged) ───────────────────────
// OTP delivery remains on Fast2SMS SMS. Do not route to Interakt.

const requestFast2SMSOTP = async (phoneNumber) => {
    const otp = Math.floor(1000 + Math.random() * 9000).toString();
    const success = await fast2sms.sendSMS(phoneNumber, `Your Oldful verification code is: ${otp}`);

    if (success) {
        await prisma.otpLog.create({
            data: {
                phoneNumber,
                code: otp,
                expiresAt: new Date(Date.now() + 10 * 60 * 1000), // 10 mins
            }
        });
        const masked = phoneNumber.replace(/(\+?\d{2,3})\d+(\d{4})$/, '$1***$2');
        logger.info(`OTP generated for ${masked}`);
        return { success: true };
    }
    return { success: false };
};

const verifyFast2SMSOTP = async (phoneNumber, code) => {
    const otpRecord = await prisma.otpLog.findFirst({
        where: {
            phoneNumber,
            code,
            expiresAt: { gt: new Date() },
            isUsed: false
        },
        orderBy: { createdAt: 'desc' }
    });

    if (otpRecord) {
        await prisma.otpLog.update({
            where: { id: otpRecord.id },
            data: { isUsed: true }
        });
        return { success: true };
    }
    return { success: false };
};

// ─── Push Notifications (FCM) ─────────────────

const { sendPushToUser, sendPushToUsers } = require('./pushNotification.service');

module.exports = {
    sendEmail,
    sendWhatsApp,
    sendWelcomeNotifications,
    sendSOSNotifications,
    sendBookingConfirmation,
    sendExpiryReminder,
    sendPushToUser,
    sendPushToUsers,
    requestOTP: requestFast2SMSOTP,
    verifyOTP: verifyFast2SMSOTP,
};
