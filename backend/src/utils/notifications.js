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

// ─── Email (ZeptoMail via email service) ──────────────────────

const emailService = require('../services/email');

// Backwards-compatible wrapper — all existing callers (sendEmail({to,subject,html,...})) continue to work.
const sendEmail = emailService.sendEmail;

// ─── WhatsApp (Fast2SMS WABA) ───────────────
// WhatsApp is now handled via Fast2SMS WABA templates.
// SMS/OTP from Fast2SMS is untouched below.

const wa = require('../services/whatsapp');
const fast2smsUtils = require('./fast2sms');

const WABA_TO_SMS_MAP = {
    AYUXA_BACKEND_ORDER: 'ORDER_CONFIRMED',
    BOOKING_CONFIRMED: 'ORDER_CONFIRMED',
    PAYMENT_RECEIVED: 'PAYMENT_RECEIVED',
    ORDER_CANCELLED: 'ORDER_CANCELLED_USER',
    WELCOME_USER: 'WELCOME_USER',
    PLAN_EXPIRY_REMINDER: 'PLAN_EXPIRED_USER',
    SHIFT_CANCELLED: 'SHIFT_CANCELLED_PARTNER',
    SOS_ALERT_OPS: 'SOS_ADMIN'
};


/**
 * Send a WhatsApp template message via Fast2SMS WABA.
 */
const sendWhatsApp = async ({ phoneNumber, templateName, parameters = [], userId = null, mediaUrl = null, documentFilename = null }) => {
    try {
        if (userId) {
            const user = await prisma.user.findUnique({ where: { id: userId }, select: { whatsappEnabled: true, smsEnabled: true } });
            if (user && !user.whatsappEnabled) {
                logger.info(`🚫 Skipping WhatsApp to ${phoneNumber} (User disabled WhatsApp)`);

                if (user.smsEnabled) {
                    logger.info(`🔄 Attempting SMS fallback for ${phoneNumber} instead...`);
                } else {
                    return false;
                }
            }
        }
    } catch (err) {
        logger.error('Preference check failed:', err);
    }

    // Normalise parameters: support both old array-of-strings and
    // object array formats ({ name, value }) used in payment controller
    const variables = parameters.map(p =>
        typeof p === 'object' && p !== null && 'value' in p ? p.value : String(p)
    );

    let success = false;
    let errorMessage = null;

    try {
        const userPrefs = userId ? await prisma.user.findUnique({ where: { id: userId } }) : null;

        // Only send WhatsApp if enabled
        if (!userPrefs || userPrefs.whatsappEnabled) {
            success = await wa.sendWhatsApp({
                template: templateName,
                mobile: phoneNumber,
                variables,
                userId,
                mediaUrl,
                docFilename: documentFilename,
            });
        }

        if (!success) {
            // Fallback to Fast2SMS SMS if WABA fails (or is disabled) and SMS is enabled
            if (!userPrefs || userPrefs.smsEnabled) {
                logger.warn(`[Notifications] WhatsApp failed or disabled for ${templateName} — attempting SMS`);
                const smsTemplateKey = WABA_TO_SMS_MAP[templateName] || templateName;
                const { SMS_TEMPLATES } = require('../services/sms');
                const fallbackTemplateId = SMS_TEMPLATES[smsTemplateKey]?.templateId || process.env[`FAST2SMS_${smsTemplateKey.toUpperCase()}_TEMPLATE_ID`];
                if (fallbackTemplateId) {
                    const smsSent = await fast2smsUtils.sendDLTSMS(phoneNumber, fallbackTemplateId, variables);
                    if (smsSent) {
                        logger.info(`[Notifications] SMS delivered for ${templateName}`);
                        success = true;
                        errorMessage = 'Delivered via SMS';
                    } else {
                        errorMessage = 'WhatsApp failed; SMS fallback also failed';
                    }
                } else {
                    errorMessage = 'WhatsApp failed; no SMS fallback configured';
                }
            } else {
                errorMessage = 'WhatsApp failed; user has SMS disabled';
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
            recipientType: userId ? 'user' : 'anonymous',
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
    await emailService.sendWelcome({
        to: user.email,
        name: user.name,
        uniqueUserId: user.uniqueUserId,
        userId: user.id,
    });

    // Welcome WhatsApp — WELCOME_USER (AYUXA_RELEASE, msgId 20828) — no body vars, doc required
    // Only send if we have a welcome document URL configured
    const welcomeDocUrl = process.env.WELCOME_DOC_URL;
    let waSuccess = false;
    if (welcomeDocUrl) {
        waSuccess = await wa.sendWelcome({
            phone: user.phone,
            userId: user.id,
            mediaUrl: welcomeDocUrl,
            docFilename: 'Ayuxa_Welcome.pdf',
        }).catch(err => {
            logger.warn('Welcome WhatsApp failed (non-fatal):', err.message);
            return false;
        });
    }

    // Welcome SMS — DLT template WELCOME_USER (215420, sender AYUXA) — Var1=name
    // Only send SMS if WhatsApp welcome didn't go through (or wasn't configured)
    if (!waSuccess) {
        const { sendSMS } = require('../services/sms');
        await sendSMS({ template: 'WELCOME_USER', mobile: user.phone, variables: [user.name], userId: user.id })
            .catch(err => logger.warn('Welcome SMS failed (non-fatal):', err.message));
    }
};

// ─── SOS Notifications ────────────────────

const sendSOSNotifications = async ({ user, location, familyContacts }) => {
    // NOTE: No approved SOS-specific WhatsApp templates exist.
    // SOS alerts are handled via:
    //   1. Direct tel: deep link (client-side)
    //   2. Admin email notification
    //   3. SMS fallback via Fast2SMS (if DLT template configured)

    // Admin — Email alert with location
    await emailService.sendSOSAlertAdmin({
        userName: user.name,
        userUniqueId: user.uniqueUserId,
        phone: user.phone,
        location: location || 'Unknown',
    });

    // Admin — SMS fallback
    if (process.env.FAST2SMS_SOS_ADMIN_TEMPLATE_ID) {
        await fast2smsUtils.sendDLTSMS(
            process.env.ADMIN_EMERGENCY_PHONE || '9999999999',
            process.env.FAST2SMS_SOS_ADMIN_TEMPLATE_ID,
            [user.name, user.uniqueUserId]
        );
    }

    // Family contacts — SMS fallback
    for (const contact of familyContacts) {
        if (process.env.FAST2SMS_SOS_FAMILY_TEMPLATE_ID) {
            await fast2smsUtils.sendDLTSMS(
                contact.phone,
                process.env.FAST2SMS_SOS_FAMILY_TEMPLATE_ID,
                [contact.name, user.name]
            );
        }
    }
};

// ─── Booking Confirmation ─────────────────

const sendBookingConfirmation = async ({ user, bookingCode, booking = null }) => {
    // 🛡️ Ensure we have current preferences even if the caller passed a partial user object
    let fullUser = user;
    if (user.id && user.smsEnabled === undefined) {
        fullUser = await prisma.user.findUnique({ 
            where: { id: user.id },
            select: { id: true, name: true, phone: true, email: true, smsEnabled: true, whatsappEnabled: true, pushEnabled: true }
        }) || user;
    }

    // Primary: WhatsApp — Template: BOOKING_CONFIRMED — Var1=name, Var2=order_id
    const waSuccess = await sendWhatsApp({
        phoneNumber: fullUser.phone,
        templateName: 'BOOKING_CONFIRMED',
        parameters: [
            fullUser.name,
            bookingCode || '-',
        ],
        userId: fullUser.id,
    });

    // DLT SMS — ORDER_CONFIRMED (215239) — Var1=name, Var2=orderId, Var3=support
    if (!waSuccess && fullUser.smsEnabled !== false) {
        const { sendSMS } = require('../services/sms');
        await sendSMS({
            template: 'ORDER_CONFIRMED',
            mobile: fullUser.phone,
            variables: [
                fullUser.name,
                bookingCode || '-',
                process.env.SUPPORT_PHONE || '9480198108',
            ],
            userId: fullUser.id,
        }).catch(err => logger.warn('ORDER_CONFIRMED SMS failed (non-fatal):', err.message));
    }
};

// ─── Expiry Reminder ──────────────────────

const sendExpiryReminder = async ({ user, plan, daysLeft, expiryDate }) => {
    // 🛡️ Ensure preferences
    let fullUser = user;
    if (user.id && user.whatsappEnabled === undefined) {
        fullUser = await prisma.user.findUnique({ 
            where: { id: user.id },
            select: { id: true, name: true, phone: true, email: true, whatsappEnabled: true, emailMarketingEnabled: true }
        }) || user;
    }

    await emailService.sendPlanExpiryReminder({
        to: fullUser.email,
        name: fullUser.name,
        planName: plan.name,
        daysLeft,
        expiryDate: new Date(expiryDate).toLocaleDateString('en-IN'),
        userId: fullUser.id,
    });

    // WhatsApp — Template: PLAN_EXPIRY_REMINDER — Var1=name only
    const waSuccess = await sendWhatsApp({
        phoneNumber: fullUser.phone,
        templateName: 'PLAN_EXPIRY_REMINDER',
        parameters: [fullUser.name],
        userId: fullUser.id,
    });

    // DLT SMS — PLAN_EXPIRED_USER (215595) — Var1=name, Var2=support
    if (!waSuccess) {
        const { sendSMS } = require('../services/sms');
        await sendSMS({
            template: 'PLAN_EXPIRED_USER',
            mobile: fullUser.phone,
            variables: [fullUser.name, process.env.SUPPORT_PHONE || '9480198108'],
            userId: fullUser.id,
        }).catch(err => logger.warn('PLAN_EXPIRED_USER SMS failed (non-fatal):', err.message));
    }
};

// ─── OTP (Fast2SMS SMS — unchanged) ───────────────────────
// OTP delivery remains on Fast2SMS SMS. Do not route to Interakt.

const requestFast2SMSOTP = async (phoneNumber) => {
    const otp = Math.floor(1000 + Math.random() * 9000).toString(); // 4-digit OTP
    const { sendSMS } = require('../services/sms');

    let success = false;
    try {
        success = await sendSMS({
            template: 'OTP_USER',
            mobile: phoneNumber,
            variables: [otp],
        });
    } catch (err) {
        logger.warn(`[OTP] DLT SMS failed: ${err.message}`);
    }

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
