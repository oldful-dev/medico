// ──────────────────────────────────────────────
//  Email Router — Named send functions
//
//  Controllers call these — they never write HTML.
//  To add a new email trigger:
//    1. Add template in templates.js
//    2. Add a named function here
//    3. Export in index.js
// ──────────────────────────────────────────────

const { sendEmail } = require('./email.service');
const { EMAIL_TEMPLATES } = require('./templates');

// ─── Onboarding ───────────────────────────────

const sendWelcome = ({ to, name, uniqueUserId, userId }) =>
    sendEmail({
        to,
        subject: EMAIL_TEMPLATES.WELCOME.subject({ name }),
        html: EMAIL_TEMPLATES.WELCOME.html({ name, uniqueUserId }),
        userId,
    });

// ─── Transactional ────────────────────────────

const sendBookingConfirmation = ({ to, name, bookingCode, serviceName, scheduledDate, amount, userId }) =>
    sendEmail({
        to,
        subject: EMAIL_TEMPLATES.BOOKING_CONFIRMED.subject({ bookingCode }),
        html: EMAIL_TEMPLATES.BOOKING_CONFIRMED.html({ name, bookingCode, serviceName, scheduledDate, amount }),
        userId,
    });

const sendBookingConfirmationAdmin = (opts) =>
    sendEmail({
        to: opts.to,
        subject: EMAIL_TEMPLATES.BOOKING_CONFIRMED_ADMIN.subject(opts),
        html: EMAIL_TEMPLATES.BOOKING_CONFIRMED_ADMIN.html(opts),
    });

const sendPaymentReceipt = ({ to, name, invoiceNumber, amount, paymentId, invoicePdfUrl, userId }) =>
    sendEmail({
        to,
        subject: EMAIL_TEMPLATES.PAYMENT_RECEIPT.subject({ amount, invoiceNumber }),
        html: EMAIL_TEMPLATES.PAYMENT_RECEIPT.html({ name, invoiceNumber, amount, paymentId, invoicePdfUrl, date: new Date().toLocaleDateString('en-IN') }),
        userId,
    });

const sendPlanExpiryReminder = ({ to, name, planName, daysLeft, expiryDate, userId }) =>
    sendEmail({
        to,
        subject: EMAIL_TEMPLATES.PLAN_EXPIRY_REMINDER.subject({ planName, daysLeft }),
        html: EMAIL_TEMPLATES.PLAN_EXPIRY_REMINDER.html({ name, planName, daysLeft, expiryDate }),
        userId,
        isMarketing: false,
    });

// ─── Support ──────────────────────────────────

const sendSupportTicketToAdmin = ({ ticketCode, subject, userName, userUniqueId, category, priority, description }) =>
    sendEmail({
        to: process.env.SUPPORT_EMAIL || process.env.ADMIN_EMAIL || 'client@ayuxacare.com',
        subject: EMAIL_TEMPLATES.SUPPORT_TICKET_ADMIN.subject({ ticketCode, subject }),
        html: EMAIL_TEMPLATES.SUPPORT_TICKET_ADMIN.html({ ticketCode, subject, userName, userUniqueId, category, priority, description }),
    });

const sendUserReplyNotifyAdmin = ({ ticketCode, message }) =>
    sendEmail({
        to: process.env.ADMIN_EMAIL || 'admin@ayuxacare.com',
        subject: EMAIL_TEMPLATES.SUPPORT_USER_REPLY_NOTIFY.subject({ ticketCode }),
        html: EMAIL_TEMPLATES.SUPPORT_USER_REPLY_NOTIFY.html({ ticketCode, message }),
    });

// ─── Emergency ────────────────────────────────

const sendSOSAlertAdmin = ({ userName, userUniqueId, phone, location }) =>
    sendEmail({
        to: process.env.ADMIN_EMERGENCY_EMAIL || 'sos@ayuxacare.com',
        subject: EMAIL_TEMPLATES.SOS_ALERT_ADMIN.subject({ userName, userUniqueId }),
        html: EMAIL_TEMPLATES.SOS_ALERT_ADMIN.html({ userName, userUniqueId, phone, location }),
    });

// ─── HR / Careers ─────────────────────────────

const sendCareersNotifyAdmin = async ({ name, email, phone, role, experience, resumeLink, coverLetter }) => {
    let toEmail = 'business@ayuxacare.com';
    try {
        const { getNotificationRecipients } = require('../companyConfig.service');
        const recipients = await getNotificationRecipients();
        if (recipients?.careers?.email) {
            toEmail = recipients.careers.email;
        }
    } catch (err) {
        // Fallback silently to default hardcoded email
    }

    return sendEmail({
        to: toEmail,
        subject: EMAIL_TEMPLATES.CAREERS_ADMIN_NOTIFY.subject({ role, name }),
        html: EMAIL_TEMPLATES.CAREERS_ADMIN_NOTIFY.html({ name, email, phone, role, experience, resumeLink, coverLetter }),
    });
};

const sendCareersApplicantConfirm = ({ to, name, role }) =>
    sendEmail({
        to,
        subject: EMAIL_TEMPLATES.CAREERS_APPLICANT_CONFIRM.subject({ role }),
        html: EMAIL_TEMPLATES.CAREERS_APPLICANT_CONFIRM.html({ name, role }),
    });

// ─── Marketing ────────────────────────────────

const sendNewsletterConfirm = ({ to }) =>
    sendEmail({
        to,
        subject: EMAIL_TEMPLATES.NEWSLETTER_CONFIRM.subject({}),
        html: EMAIL_TEMPLATES.NEWSLETTER_CONFIRM.html({}),
        isMarketing: true,
    });

const sendWaitlistConfirm = ({ to, name, serviceName, city }) =>
    sendEmail({
        to,
        subject: EMAIL_TEMPLATES.WAITLIST_CONFIRM.subject({ serviceName }),
        html: EMAIL_TEMPLATES.WAITLIST_CONFIRM.html({ name, serviceName, city }),
    });

module.exports = {
    sendWelcome,
    sendBookingConfirmation,
    sendBookingConfirmationAdmin,
    sendPaymentReceipt,
    sendPlanExpiryReminder,
    sendSupportTicketToAdmin,
    sendUserReplyNotifyAdmin,
    sendSOSAlertAdmin,
    sendCareersNotifyAdmin,
    sendCareersApplicantConfirm,
    sendNewsletterConfirm,
    sendWaitlistConfirm,
};
