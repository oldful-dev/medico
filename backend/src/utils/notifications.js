// ──────────────────────────────────────────────
//  Notification Service (Email + WhatsApp)
// ──────────────────────────────────────────────

const { logger } = require('../config/logger');
const prisma = require('../config/database');
const twilio = require('twilio');

// ─── Email (SendGrid) ──────────────────────

const sgMail = require('@sendgrid/mail');

const sendEmail = async ({ to, subject, html, attachments = [] }) => {
    try {
        if (process.env.SENDGRID_API_KEY) {
            sgMail.setApiKey(process.env.SENDGRID_API_KEY);
            await sgMail.send({
                to,
                from: { email: process.env.SENDGRID_FROM_EMAIL || 'noreply@oldful.com', name: 'Oldful Healthcare' },
                subject,
                html,
                attachments
            });
        } else {
            logger.warn('SENDGRID_API_KEY not set. Simulating email send.');
        }

        logger.info(`📧 Email sent to ${to}: ${subject}`);

        // Log notification
        await prisma.notificationLog.create({
            data: {
                channel: 'EMAIL',
                recipientId: null,
                subject,
                body: html,
                isSent: true,
                sentAt: new Date(),
            },
        });

        return true;
    } catch (error) {
        logger.error('Email send error:', error);

        await prisma.notificationLog.create({
            data: {
                channel: 'EMAIL',
                subject,
                body: html,
                isSent: false,
                errorMessage: error.message,
            },
        });

        return false;
    }
};

// ─── WhatsApp (Interakt) ───────────────────

const sendWhatsApp = async ({ phoneNumber, templateName, parameters = [] }) => {
    try {
        if (process.env.INTERAKT_API_KEY) {
            const response = await fetch(`${process.env.INTERAKT_BASE_URL || 'https://api.interakt.ai/v1'}/public/message/`, {
                method: 'POST',
                headers: {
                    'Authorization': `Basic ${process.env.INTERAKT_API_KEY}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    countryCode: '+91',
                    phoneNumber: phoneNumber.replace('+91', ''), // Ensure format matches Interakt logic
                    type: 'Template',
                    template: { name: templateName, languageCode: 'en', bodyValues: parameters },
                }),
            });

            if (!response.ok) {
                const errorBody = await response.text();
                throw new Error(`Interakt API Error: ${response.status} - ${errorBody}`);
            }
        } else {
            logger.warn('INTERAKT_API_KEY not set. Simulating WhatsApp send.');
        }

        logger.info(`📱 WhatsApp sent to ${phoneNumber}: template ${templateName}`);

        await prisma.notificationLog.create({
            data: {
                channel: 'WHATSAPP',
                body: `Template: ${templateName}, Params: ${JSON.stringify(parameters)}`,
                isSent: true,
                sentAt: new Date(),
            },
        });

        return true;
    } catch (error) {
        logger.error('WhatsApp send error:', error);

        await prisma.notificationLog.create({
            data: {
                channel: 'WHATSAPP',
                body: `Template: ${templateName}`,
                isSent: false,
                errorMessage: error.message,
            },
        });

        return false;
    }
};

// ─── Welcome Notifications ─────────────────

const sendWelcomeNotifications = async (user) => {
    // Welcome Email
    await sendEmail({
        to: user.email,
        subject: `Welcome to Oldful, ${user.name}! 🎉`,
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
    });
};

// ─── Twilio Verify (OTP) ───────────────────

const twilioClient = process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN
    ? twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN)
    : null;

const requestTwilioOTP = async (phoneNumber) => {
    try {
        if (!twilioClient || !process.env.TWILIO_VERIFY_SERVICE_SID) {
            logger.warn('Twilio credentials not set. Simulating OTP request.');
            return { success: true, simulated: true };
        }

        const verification = await twilioClient.verify.v2.services(process.env.TWILIO_VERIFY_SERVICE_SID)
            .verifications
            .create({ to: phoneNumber, channel: 'sms' });

        return { success: true, status: verification.status };
    } catch (error) {
        logger.error('Twilio OTP request error:', error);
        throw error;
    }
};

const verifyTwilioOTP = async (phoneNumber, code) => {
    try {
        if (!twilioClient || !process.env.TWILIO_VERIFY_SERVICE_SID) {
            // Dev bypass
            if (process.env.NODE_ENV === 'development' && code === '1234') {
                return { success: true, status: 'approved' };
            }
            throw new Error('Twilio credentials not set and not in dev bypass.');
        }

        const verificationCheck = await twilioClient.verify.v2.services(process.env.TWILIO_VERIFY_SERVICE_SID)
            .verificationChecks
            .create({ to: phoneNumber, code: code });

        return { success: verificationCheck.status === 'approved', status: verificationCheck.status };
    } catch (error) {
        logger.error('Twilio OTP verify error:', error);
        throw error;
    }
};

module.exports = {
    sendEmail,
    sendWhatsApp,
    sendWelcomeNotifications,
    sendSOSNotifications,
    sendExpiryReminder,
    requestTwilioOTP,
    verifyTwilioOTP,
};
