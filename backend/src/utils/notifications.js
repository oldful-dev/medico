// ──────────────────────────────────────────────
//  Notification Service (Email + WhatsApp)
// ──────────────────────────────────────────────

const { logger } = require('../config/logger');
const prisma = require('../config/database');

// ─── Email (SendGrid) ──────────────────────

const sendEmail = async ({ to, subject, html, attachments = [] }) => {
    try {
        // In production, integrate with SendGrid:
        // const sgMail = require('@sendgrid/mail');
        // sgMail.setApiKey(process.env.SENDGRID_API_KEY);
        // await sgMail.send({ to, from: { email, name }, subject, html, attachments });

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
        // In production, integrate with Interakt API:
        // const response = await fetch(`${process.env.INTERAKT_BASE_URL}/public/message/`, {
        //   method: 'POST',
        //   headers: {
        //     'Authorization': `Basic ${process.env.INTERAKT_API_KEY}`,
        //     'Content-Type': 'application/json',
        //   },
        //   body: JSON.stringify({
        //     countryCode: '+91',
        //     phoneNumber,
        //     type: 'Template',
        //     template: { name: templateName, languageCode: 'en', bodyValues: parameters },
        //   }),
        // });

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

module.exports = {
    sendEmail,
    sendWhatsApp,
    sendWelcomeNotifications,
    sendSOSNotifications,
    sendExpiryReminder,
};
