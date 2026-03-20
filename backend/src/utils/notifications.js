// ──────────────────────────────────────────────
//  Notification Service (Email + WhatsApp)
// ──────────────────────────────────────────────

const { logger } = require('../config/logger');
const prisma = require('../config/database');


// ─── Email (SendGrid) ──────────────────────

// ─── Email (ZeptoMail) ──────────────────────

const zeptoMail = require('./zeptomail');

const sendEmail = async ({ to, subject, html, attachments = [], userId = null }) => {
    try {
        const success = await zeptoMail.sendEmail({ to, subject, html });

        if (success) {
            logger.info(`📧 Email sent to ${to}: ${subject}`);
        }

        // Log notification
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

// ─── WhatsApp (Fast2SMS) ───────────────────

const fast2sms = require('./fast2sms');

const sendWhatsApp = async ({ phoneNumber, templateName, parameters = [], userId = null }) => {
    try {
        const success = await fast2sms.sendWhatsAppMessage(phoneNumber, templateName, parameters);

        logger.info(`📱 WhatsApp sent to ${phoneNumber}: template ${templateName}`);

        await prisma.notificationLog.create({
            data: {
                channel: 'WHATSAPP',
                recipientId: userId,
                recipientType: userId ? 'user' : 'user',
                body: `Template: ${templateName}, Params: ${JSON.stringify(parameters)}`,
                isSent: success,
                sentAt: success ? new Date() : null,
                errorMessage: success ? null : 'Fast2SMS failed',
            },
        });

        return success;
    } catch (error) {
        logger.error('WhatsApp send error:', error);
        return false;
    }
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

    // Welcome WhatsApp
    await sendWhatsApp({
        phoneNumber: user.phone,
        templateName: 'welcome_message',
        parameters: [user.name, user.uniqueUserId],
        userId: user.id,
    });
};

// ─── SOS Notifications ────────────────────

const sendSOSNotifications = async ({ user, location, familyContacts }) => {
    // Notify admin
    await sendWhatsApp({
        phoneNumber: process.env.ADMIN_EMERGENCY_PHONE || '9999999999',
        templateName: 'sos_alert_admin',
        parameters: [user.name, user.uniqueUserId, location || 'Unknown'],
    });

    // Notify family contacts
    for (const contact of familyContacts) {
        await sendWhatsApp({
            phoneNumber: contact.phone,
            templateName: 'sos_alert_family',
            parameters: [user.name, contact.name, location || 'Unknown'],
        });
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

    await sendWhatsApp({
        phoneNumber: user.phone,
        templateName: 'plan_expiry_reminder',
        parameters: [user.name, plan.name, String(daysLeft)],
        userId: user.id,
    });
};

// ─── OTP (Fast2SMS) ───────────────────

const requestFast2SMSOTP = async (phoneNumber) => {
    // Note: Fast2SMS 'q' route can be used to send custom OTPs
    const otp = Math.floor(1000 + Math.random() * 9000).toString();
    const success = await fast2sms.sendSMS(phoneNumber, `Your Oldful verification code is: ${otp}`);

    if (success) {
        // Store OTP in database for verification
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
    sendExpiryReminder,
    sendPushToUser,
    sendPushToUsers,
    requestOTP: requestFast2SMSOTP,
    verifyOTP: verifyFast2SMSOTP,
};
