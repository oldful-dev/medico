// ──────────────────────────────────────────────
//  Email Service — public exports
//
//  Preferred usage (no HTML in controllers):
//    const email = require('../services/email');
//    await email.sendBookingConfirmation({ to, name, bookingCode, ... });
//
//  Low-level usage (custom one-off emails):
//    const { sendEmail } = require('../services/email');
//    await sendEmail({ to, subject, html, userId });
// ──────────────────────────────────────────────

const { sendEmail } = require('./email.service');
const { EMAIL_TEMPLATES } = require('./templates');

const {
    sendWelcome,
    sendBookingConfirmation,
    sendBookingConfirmationAdmin,
    sendPaymentReceipt,
    sendDataExport,
    sendPlanExpiryReminder,
    sendBirthdayWish,
    sendAnnouncementUpdate,
    sendPromoOfferEmail,
    sendSupportTicketToAdmin,
    sendUserReplyNotifyAdmin,
    sendSOSAlertAdmin,
    sendSOSResolvedClient,
    sendCareersNotifyAdmin,
    sendCareersApplicantConfirm,
    sendNewsletterConfirm,
    sendWaitlistConfirm,
} = require('./router');

module.exports = {
    // Low-level
    sendEmail,
    EMAIL_TEMPLATES,

    // Onboarding
    sendWelcome,

    // Transactional
    sendBookingConfirmation,
    sendBookingConfirmationAdmin,
    sendPaymentReceipt,
    sendDataExport,
    sendPlanExpiryReminder,
    sendBirthdayWish,
    sendAnnouncementUpdate,
    sendPromoOfferEmail,

    // Support
    sendSupportTicketToAdmin,
    sendUserReplyNotifyAdmin,

    // Emergency
    sendSOSAlertAdmin,
    sendSOSResolvedClient,

    // HR / Careers
    sendCareersNotifyAdmin,
    sendCareersApplicantConfirm,

    // Marketing
    sendNewsletterConfirm,
    sendWaitlistConfirm,
};
