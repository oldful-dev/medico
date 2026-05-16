// ──────────────────────────────────────────────
//  Fast2SMS WABA Service — WhatsApp Business API
//  Replaces Interakt for all WhatsApp messaging.
//  SMS/OTP delivery remains on Fast2SMS.
//
//  Fast2SMS WABA API docs: https://docs.fast2sms.com/reference/get-waba-template-details
//  Auth: API key in query params
// ──────────────────────────────────────────────

const axios = require('axios');
const { logger } = require('../config/logger');

const WHATSAPP_URL = 'https://www.fast2sms.com/dev/whatsapp';

// ─── WABA Template Registry ───────────────────
// Maps logical event names → Fast2SMS WABA template IDs
// Each template is pre-approved on Meta with specific variables
//
// Template reference (approved as of 2026-05):
//
//  20515 verification_code      AUTHENTICATION {{1}}=code {{2}}=support_contact (Expires in 5 minutes)
//  20510 ayuxa_remember         MARKETING {{1}}=name (Header: Friendly Remember!)
//  20511 birthday_wishes        MARKETING {{1}}=name (Header: Image Media Required)
//  20512 lab_test              UTILITY {{1}}=name (Header: Lab Test Report Available)
//  20513 urgent_alert          UTILITY {{1}}=alert_type {{2}}=ayuxa_id (URGENT ALERT SOS)
//  20514 welcome_flow          MARKETING (Header: Document Media Required)
//  20519 order_status          UTILITY {{1}}=name {{2}}=order_id (Header: Order Cancelled)
//  20520 payment_successful    UTILITY {{1}}=name {{2}}=amount (Header: Payment successful!)
//  20521 booking_confirmation  UTILITY {{1}}=name {{2}}=order_id (Header: Booking Confirmed)
//  20522 prescription_received UTILITY {{1}}=name (Header: Doctor Prescription Uploaded)
//  20523 plan_expiry_reminder  MARKETING {{1}}=name (Header: Plan expiry reminder!)
//  20525 feedback              MARKETING {{1}}=name (Header: Feedback Request)
//
const TEMPLATES = {
    // ── Authentication ──
    otp:                     20515,  // verification_code

    // ── Core transactional ──
    welcome_message:         20514,  // welcome_flow
    booking_confirmation:    20521,  // booking_confirmation
    payment_confirmation:    20520,  // payment_successful
    invoice_confirmation:    20520,  // payment_successful
    payment_link:            20520,  // payment_successful (no dedicated template)

    // ── Medical flows ──
    prescription_received:   20522,  // prescription_received
    lab_report:              20512,  // lab_test
    prescription_reminder:   20510,  // ayuxa_remember — closest approved template for medication reminders

    // ── Plan / subscription ──
    plan_expiry_reminder:    20523,  // plan_expiry_reminder

    // ── Campaign templates (admin notification campaigns) ──
    ayuxa_remember:          20510,  // ayuxa_remember marketing
    birthday_wishes:         20511,  // birthday_wishes marketing

    // ── Support & feedback ──
    followup_feedback:       20525,  // feedback

    // ── SOS ──
    sos_alert_admin:         20513,  // urgent_alert
    sos_alert_family:        20513,  // urgent_alert
};

// ─── Phone normaliser ─────────────────────────
// Fast2SMS WABA expects 10 digits (no country code)
const normalisePhone = (phone) => {
    const digits = phone.replace(/\D/g, '');
    if (digits.length === 12 && digits.startsWith('91')) return digits.slice(2);
    if (digits.length === 10) return digits;
    return digits.slice(-10);
};

// ─── Core send function ───────────────────────

/**
 * Send a WhatsApp template message via Fast2SMS WABA.
 *
 * @param {object}   opts
 * @param {string}   opts.phone          - Recipient phone (any format)
 * @param {string}   opts.templateName   - Key from TEMPLATES map above
 * @param {string[]} opts.variables      - Ordered body variable values
 * @param {string}   [opts.mediaUrl]     - Optional media URL (image/document)
 * @param {string}   [opts.documentFilename] - Optional document filename
 * @returns {Promise<boolean>}
 */
const sendWhatsAppMessage = async ({ phone, templateName, variables = [], mediaUrl, documentFilename }) => {
    let apiKey = process.env.FAST2SMS_API_KEY;

    if (!apiKey) {
        logger.warn('[Fast2SMS WABA] FAST2SMS_API_KEY not set — skipping WhatsApp send');
        return false;
    }

    const resolvedTemplateId = TEMPLATES[templateName] || null;
    if (!resolvedTemplateId) {
        logger.warn(`[Fast2SMS WABA] Unknown template: ${templateName} — skipping send`);
        return false;
    }

    const phoneNumber = normalisePhone(phone);
    const phoneNumberId = process.env.FAST2SMS_WABA_PHONE_NUMBER_ID || '1137788802753379';

    try {
        // Build query parameters
        const params = new URLSearchParams({
            authorization: apiKey,
            message_id: String(resolvedTemplateId),
            phone_number_id: phoneNumberId,
            numbers: phoneNumber,
        });

        // Add variables if provided (pipe-separated)
        if (variables.length > 0) {
            params.append('variables_values', variables.map(String).join('|'));
        }

        // Add media URL if provided
        if (mediaUrl) {
            params.append('media_url', mediaUrl);
        }

        // Add document filename if provided
        if (documentFilename) {
            params.append('document_filename', documentFilename);
        }

        const url = `${WHATSAPP_URL}?${params.toString()}`;

        const response = await axios.get(url, {
            timeout: 10000,
        });

        const resData = response.data;

        // Fast2SMS WABA returns { return: true } or { status: 'sent' } on success
        if (resData.return === true || resData.status === 'sent') {
            logger.info(`[Fast2SMS WABA] ✅ WhatsApp → +91${phoneNumber} [${templateName} / ID:${resolvedTemplateId}]`);
            return true;
        }

        logger.warn(`[Fast2SMS WABA] Rejected (${templateName}): ${JSON.stringify(resData)}`);
        return false;

    } catch (error) {
        const status = error.response?.status;
        const errBody = error.response?.data;
        const errMsg = typeof errBody === 'string' ? errBody : JSON.stringify(errBody) || error.message;
        logger.error(`[Fast2SMS WABA] Request failed (${templateName}): HTTP ${status || 'network'}: ${errMsg}`);
        return false;
    }
};

// ─── High-level event helpers ─────────────────
// Variable counts match the approved templates exactly.

const SUPPORT_PHONE = '+91 94801 98108';
const SUPPORT_EMAIL = 'client@ayuxa.com';

/**
 * OTP verification via WhatsApp
 * Template: verification_code — {{1}}=code {{2}}=support_contact
 */
const sendOTP = ({ phone, code }) =>
    sendWhatsAppMessage({
        phone,
        templateName: 'otp',
        variables: [String(code), SUPPORT_PHONE],
    });

/**
 * Welcome after signup
 * Template: welcome_flow (no body variables)
 */
const sendWelcome = ({ phone, name }) =>
    sendWhatsAppMessage({
        phone,
        templateName: 'welcome_message',
        variables: [],
    });

/**
 * Booking / appointment confirmed
 * Template: booking_confirmation — {{1}}=name {{2}}=order_id
 */
const sendBookingConfirmation = ({ phone, name, service, orderId }) =>
    sendWhatsAppMessage({
        phone,
        templateName: 'booking_confirmation',
        variables: [name || 'Customer', orderId || '-'],
    });

/**
 * Send payment link to user
 * Template: payment_successful — {{1}}=name {{2}}=amount
 */
const sendPaymentLink = ({ phone, name, amount, service, paymentUrl }) =>
    sendWhatsAppMessage({
        phone,
        templateName: 'payment_link',
        variables: [name || 'Customer', String(amount)],
    });

/**
 * Payment receipt / invoice
 * Template: payment_successful — {{1}}=name {{2}}=amount
 * With optional document header (invoice PDF)
 */
const sendPaymentConfirmation = ({ phone, name, amount, headerUrl }) =>
    sendWhatsAppMessage({
        phone,
        templateName: 'payment_confirmation',
        variables: [name || 'Customer', String(amount)],
        mediaUrl: headerUrl,
    });

/**
 * Prescription received acknowledgement
 * Template: prescription_received — {{1}}=name
 */
const sendPrescriptionReceived = ({ phone, name, orderRef }) =>
    sendWhatsAppMessage({
        phone,
        templateName: 'prescription_received',
        variables: [name || 'Customer'],
    });

/**
 * Lab report ready
 * Template: lab_test — {{1}}=name
 */
const sendLabReport = ({ phone, name }) =>
    sendWhatsAppMessage({
        phone,
        templateName: 'lab_report',
        variables: [name || 'Customer'],
    });

/**
 * Daily medication / wellness reminder
 * Template: ayuxa_remember (ID 20510) — Var1=name
 */
const sendPrescriptionReminder = ({ phone, name }) =>
    sendWhatsAppMessage({
        phone,
        templateName: 'prescription_reminder',
        variables: [name || 'Customer'],
    });

/**
 * Plan expiry / renewal reminder
 * Template: plan_expiry_reminder — {{1}}=name
 */
const sendPlanExpiryReminder = ({ phone, name, planName }) =>
    sendWhatsAppMessage({
        phone,
        templateName: 'plan_expiry_reminder',
        variables: [name || 'Customer'],
    });

/**
 * Feedback survey after service
 * Template: feedback — {{1}}=name
 */
const sendFeedbackSurvey = ({ phone, name }) =>
    sendWhatsAppMessage({
        phone,
        templateName: 'followup_feedback',
        variables: [name || 'Customer'],
    });

/**
 * SOS alert to admin
 * Template: urgent_alert — {{1}}=alert_type {{2}}=ayuxa_id
 */
const sendSOSAlertAdmin = ({ phone, name, uniqueUserId, locationLink }) =>
    sendWhatsAppMessage({
        phone,
        templateName: 'sos_alert_admin',
        variables: [name || 'User', uniqueUserId || '-'],
    });

/**
 * SOS alert to family contact
 * Template: urgent_alert — {{1}}=alert_type {{2}}=ayuxa_id
 */
const sendSOSAlertFamily = ({ phone, name, contactName, locationLink }) =>
    sendWhatsAppMessage({
        phone,
        templateName: 'sos_alert_family',
        variables: [contactName || 'Contact', name || 'User'],
    });

module.exports = {
    // Low-level — use when no helper exists
    sendWhatsAppMessage,
    TEMPLATES,

    // High-level helpers
    sendOTP,
    sendWelcome,
    sendBookingConfirmation,
    sendPaymentLink,
    sendPaymentConfirmation,
    sendPrescriptionReceived,
    sendLabReport,
    sendPrescriptionReminder,
    sendPlanExpiryReminder,
    sendFeedbackSurvey,
    sendSOSAlertAdmin,
    sendSOSAlertFamily,
};
