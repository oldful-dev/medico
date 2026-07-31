// ──────────────────────────────────────────────
//  Interakt Service — compatibility shim
//
//  All WhatsApp logic now lives in src/services/whatsapp/.
//  This file re-exports the same API surface so existing
//  callers continue to work without modification.
// ──────────────────────────────────────────────

const wa = require('./whatsapp');
const { WHATSAPP_TEMPLATES } = require('./whatsapp/templates');

// Legacy TEMPLATES map (interakt.service.js callers used numeric IDs directly)
const TEMPLATES = Object.fromEntries(
    Object.entries(WHATSAPP_TEMPLATES).map(([, v]) => [v.messageId, v.messageId])
);

/**
 * Legacy low-level helper.
 * Existing callers: notifications.js sendWhatsApp() → fast2sms.sendWhatsAppMessage()
 */
const sendWhatsAppMessage = ({ phone, templateName, variables = [], mediaUrl, documentFilename }) =>
    wa.sendWhatsApp({
        template: _legacyTemplateNameToKey(templateName),
        mobile: phone,
        variables,
        mediaUrl,
        docFilename: documentFilename,
    });

// Map old logical names from interakt.service.js → new registry keys
const LEGACY_NAME_MAP = {
    otp:                    'OTP_USER',
    welcome_message:        'WELCOME_USER',
    booking_confirmation:   'BOOKING_CONFIRMED',
    payment_confirmation:   'PAYMENT_RECEIVED',
    invoice_confirmation:   'PAYMENT_RECEIVED',
    payment_link:           'PAYMENT_RECEIVED',
    prescription_received:  'PRESCRIPTION_RECEIVED',
    lab_report:             'LAB_REPORT_READY',
    prescription_reminder:  'WELLNESS_REMINDER',
    plan_expiry_reminder:   'PLAN_EXPIRY_REMINDER',
    ayuxa_remember:         'WELLNESS_REMINDER',
    birthday_wishes:        'BIRTHDAY_WISHES',
    followup_feedback:      'WELLNESS_REMINDER',
    sos_alert_admin:        'SOS_ALERT_OPS',
    sos_alert_family:       'SOS_ALERT_CLIENT',
    sos_office:             'SOS_OFFICE',
};

const _legacyTemplateNameToKey = (name) => LEGACY_NAME_MAP[name] || name;

module.exports = {
    sendWhatsAppMessage,
    TEMPLATES,

    // High-level helpers (preserved for direct callers in notifications.js)
    sendOTP:                  wa.sendOTP,
    sendWelcome:              ({ phone, name }) => wa.sendWelcome({ phone, userId: null }),
    sendBookingConfirmation:  ({ phone, name, orderId }) => wa.sendBookingConfirmed({ phone, name, orderId }),
    sendPaymentLink:          ({ phone, name, amount }) => wa.sendPaymentReceived({ phone, name, amount }),
    sendPaymentConfirmation:  ({ phone, name, amount }) => wa.sendPaymentReceived({ phone, name, amount }),
    sendPrescriptionReceived: wa.sendPrescriptionReceived,
    sendLabReport:            ({ phone, name }) => wa.sendLabReportReady({ phone, name }),
    sendPrescriptionReminder: ({ phone, name }) => wa.sendWellnessReminder({ phone, name }),
    sendPlanExpiryReminder:   wa.sendPlanExpiryReminder,
    sendFeedbackSurvey:       ({ phone, name }) => wa.sendWellnessReminder({ phone, name }),
    sendSOSAlertAdmin:        wa.sendSOSAlertOps,
    sendSOSAlertFamily:       ({ phone, name, contactName }) => wa.sendSOSAlertClient({ phone, userName: name, ayuxaId: contactName }),
};
