// ──────────────────────────────────────────────
//  WhatsApp Service — public exports
//
//  Preferred usage (no template keys in controllers):
//    const wa = require('../services/whatsapp');
//    await wa.sendBookingConfirmed({ phone, name, orderId, userId });
//
//  Low-level usage (when no helper exists):
//    const { sendWhatsApp } = require('../services/whatsapp');
//    await sendWhatsApp({ template: 'LAB_REPORT_READY', mobile, variables: [name], userId });
// ──────────────────────────────────────────────

const { sendWhatsApp } = require('./whatsapp.service');
const { WHATSAPP_TEMPLATES, WABA_ACCOUNTS } = require('./templates');

const {
    // Auth
    sendOTP,
    sendFamilyOTP,
    sendEmpOTP,

    // Onboarding / marketing
    sendWelcome,
    sendWellnessReminder,
    sendBirthdayWishes,

    // Transactional — client
    sendBookingConfirmed,
    sendPaymentReceived,
    sendOrderCancelled,
    sendPrescriptionReceived,
    sendLabReportReady,
    sendPlanExpiryReminder,
    sendSOSAlertClient,

    // Family
    sendSOSAlertFamily,
    sendPlanExpiredFamily,
    sendPlanExpiryFamily,
    sendHealthCheckFamily,
    sendPrescriptionUploadedFamily,

    // Employee / caregiver
    sendShiftAssigned,
    sendSOSDispatch,
    sendShiftCancelledWA,

    // Ops / emergency
    sendSOSAlertOps,
    sendSOSOffice,
} = require('./router');

module.exports = {
    // Low-level
    sendWhatsApp,
    WHATSAPP_TEMPLATES,
    WABA_ACCOUNTS,

    // Auth
    sendOTP,
    sendFamilyOTP,
    sendEmpOTP,

    // Onboarding / marketing
    sendWelcome,
    sendWellnessReminder,
    sendBirthdayWishes,

    // Transactional — client
    sendBookingConfirmed,
    sendPaymentReceived,
    sendOrderCancelled,
    sendPrescriptionReceived,
    sendLabReportReady,
    sendPlanExpiryReminder,
    sendSOSAlertClient,

    // Family
    sendSOSAlertFamily,
    sendPlanExpiredFamily,
    sendPlanExpiryFamily,
    sendHealthCheckFamily,
    sendPrescriptionUploadedFamily,

    // Employee / caregiver
    sendShiftAssigned,
    sendSOSDispatch,
    sendShiftCancelledWA,

    // Ops / emergency
    sendSOSAlertOps,
    sendSOSOffice,
};
