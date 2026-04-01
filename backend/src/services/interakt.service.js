// ──────────────────────────────────────────────
//  Interakt Service — WhatsApp Business API
//  Replaces Fast2SMS for all WhatsApp messaging.
//  Fast2SMS is kept solely for SMS/OTP delivery.
//
//  Interakt API docs: https://developers.interakt.ai
//  Auth: Basic (API key is pre-encoded by Interakt)
// ──────────────────────────────────────────────

const axios = require('axios');
const { logger } = require('../config/logger');

const BASE_URL = 'https://api.interakt.ai/v1/public/message/';
const MAX_RETRIES = 2;
const RETRY_DELAY_MS = 1000;

// ─── Approved template registry ───────────────
// Maps logical event names → actual Meta-approved
// template names on the Interakt dashboard.
//
// Template reference (approved as of 2026-04-01):
//
//  otp_template               AUTHENTICATION  {{1}}=code
//  oldful_welcome             MARKETING       {{1}}=name                       (DOCUMENT header)
//  service_request_           UTILITY         {{1}}=name {{2}}=service {{3}}=orderId {{4}}=phone {{5}}=email
//  payment_link               UTILITY         {{1}}=name {{2}}=amount {{3}}=service {{4}}=paymentUrl
//  oldful_receipt             UTILITY         {{1}}=name {{2}}=amount {{3}}=phone {{4}}=email  (DOCUMENT header)
//  prescription_flow          UTILITY         {{1}}=name {{2}}=orderRef
//  lab_report_delivery        UTILITY         {{1}}=name                       (DOCUMENT header)
//  medication_reminder_daily  UTILITY         (no body vars)
//  renewal_reminder           MARKETING       {{1}}=name {{2}}=planName {{3}}=phone {{4}}=email
//  feedback_survey_form       UTILITY         {{1}}=name
//
const TEMPLATES = {
    // ── Authentication ──
    otp:                     'otp_template',

    // ── Core transactional ──
    welcome_message:         'oldful_welcome',
    booking_confirmation:    'service_request_',
    payment_link:            'payment_link',
    payment_confirmation:    'oldful_receipt',
    invoice_confirmation:    'oldful_receipt',

    // ── Medical flows ──
    prescription_received:   'prescription_flow',
    lab_report:              'lab_report_delivery',
    prescription_reminder:   'medication_reminder_daily',

    // ── Plan / subscription ──
    plan_expiry_reminder:    'renewal_reminder',

    // ── Support & feedback ──
    followup_feedback:       'feedback_survey_form',
};

// ─── Phone normaliser ─────────────────────────
// Interakt phoneNumber field expects 10 digits (no country code).
// countryCode is sent separately as '+91'.
const normalisePhone = (phone) => {
    const digits = phone.replace(/\D/g, '');
    if (digits.length === 12 && digits.startsWith('91')) return digits.slice(2);
    if (digits.length === 10) return digits;
    // Longer strings — take last 10
    return digits.slice(-10);
};

// ─── Core send function ───────────────────────

/**
 * Send a WhatsApp template message via Interakt.
 *
 * @param {object}   opts
 * @param {string}   opts.phone          - Recipient phone (any format)
 * @param {string}   opts.templateName   - Key from TEMPLATES map above
 * @param {string[]} opts.variables      - Ordered body variable values
 * @param {string}   [opts.callToActionUrl] - Optional URL for URL-button templates
 * @returns {Promise<boolean>}
 */
const sendWhatsAppMessage = async ({ phone, templateName, variables = [], callToActionUrl }) => {
    const apiKey = process.env.INTERAKT_API_KEY;

    if (!apiKey) {
        logger.warn('[Interakt] INTERAKT_API_KEY not set — skipping WhatsApp send');
        return false;
    }

    const resolvedTemplate = TEMPLATES[templateName] || templateName;
    const phoneNumber = normalisePhone(phone);

    const payload = {
        countryCode: '+91',
        phoneNumber,
        callbackData: `event:${templateName}`,
        type: 'Template',
        template: {
            name: resolvedTemplate,
            languageCode: 'en',
            ...(variables.length > 0 && {
                bodyValues: variables.map(String),
            }),
            ...(callToActionUrl && {
                buttonValues: { 0: [callToActionUrl] },
            }),
        },
    };

    let lastError = null;

    for (let attempt = 1; attempt <= MAX_RETRIES + 1; attempt++) {
        try {
            const response = await axios.post(BASE_URL, payload, {
                headers: {
                    // Interakt provides the key already base64-encoded
                    Authorization: `Basic ${apiKey}`,
                    'Content-Type': 'application/json',
                },
                timeout: 10000,
            });

            const resData = response.data;

            if (resData.result === true || resData.message === 'Request Accepted.') {
                logger.info(`[Interakt] ✅ WhatsApp → +91${phoneNumber} [${resolvedTemplate}]`);
                return true;
            }

            logger.warn(`[Interakt] Rejected (attempt ${attempt}): ${JSON.stringify(resData)}`);
            lastError = resData.message || JSON.stringify(resData);

        } catch (err) {
            const status = err.response?.status;
            const errBody = err.response?.data;
            lastError = `HTTP ${status}: ${errBody?.message || JSON.stringify(errBody) || err.message}`;
            logger.warn(`[Interakt] Request failed (attempt ${attempt}): ${lastError}`);

            // Don't retry on 4xx client errors
            if (status && status >= 400 && status < 500) break;
        }

        if (attempt <= MAX_RETRIES) {
            await new Promise(r => setTimeout(r, RETRY_DELAY_MS * attempt));
        }
    }

    logger.error(`[Interakt] ❌ Failed → +91${phoneNumber} [${resolvedTemplate}]: ${lastError}`);
    return false;
};

// ─── High-level event helpers ─────────────────
// Variable counts match the approved templates exactly.

const SUPPORT_PHONE = '+91 94801 98108';
const SUPPORT_EMAIL = 'client@oldful.com';

/**
 * OTP verification via WhatsApp
 * Template: otp_template — {{1}}=code
 */
const sendOTP = ({ phone, code }) =>
    sendWhatsAppMessage({
        phone,
        templateName: 'otp',
        variables: [String(code)],
    });

/**
 * Welcome after signup (DOCUMENT header — welcome brochure PDF)
 * Template: oldful_welcome — {{1}}=name
 */
const sendWelcome = ({ phone, name }) =>
    sendWhatsAppMessage({
        phone,
        templateName: 'welcome_message',
        variables: [name],
    });

/**
 * Booking / appointment confirmed
 * Template: service_request_ — {{1}}=name {{2}}=service {{3}}=orderId {{4}}=phone {{5}}=email
 */
const sendBookingConfirmation = ({ phone, name, service, orderId }) =>
    sendWhatsAppMessage({
        phone,
        templateName: 'booking_confirmation',
        variables: [name, service || 'your requested service', orderId || '-', SUPPORT_PHONE, SUPPORT_EMAIL],
    });

/**
 * Send payment link to user
 * Template: payment_link — {{1}}=name {{2}}=amount {{3}}=service {{4}}=paymentUrl
 */
const sendPaymentLink = ({ phone, name, amount, service, paymentUrl }) =>
    sendWhatsAppMessage({
        phone,
        templateName: 'payment_link',
        variables: [name, String(amount), service || 'Oldful services', paymentUrl || 'www.oldful.com/payment'],
    });

/**
 * Payment receipt / invoice (DOCUMENT header — receipt PDF)
 * Template: oldful_receipt — {{1}}=name {{2}}=amount {{3}}=phone {{4}}=email
 */
const sendPaymentConfirmation = ({ phone, name, amount }) =>
    sendWhatsAppMessage({
        phone,
        templateName: 'payment_confirmation',
        variables: [name, String(amount), SUPPORT_PHONE, SUPPORT_EMAIL],
    });

/**
 * Prescription received acknowledgement
 * Template: prescription_flow — {{1}}=name {{2}}=orderRef
 */
const sendPrescriptionReceived = ({ phone, name, orderRef }) =>
    sendWhatsAppMessage({
        phone,
        templateName: 'prescription_received',
        variables: [name, orderRef || '-'],
    });

/**
 * Lab report ready (DOCUMENT header — report PDF)
 * Template: lab_report_delivery — {{1}}=name
 */
const sendLabReport = ({ phone, name }) =>
    sendWhatsAppMessage({
        phone,
        templateName: 'lab_report',
        variables: [name],
    });

/**
 * Daily medication reminder
 * Template: medication_reminder_daily — (no body variables)
 */
const sendPrescriptionReminder = ({ phone }) =>
    sendWhatsAppMessage({
        phone,
        templateName: 'prescription_reminder',
        variables: [],
    });

/**
 * Plan expiry / renewal reminder
 * Template: renewal_reminder — {{1}}=name {{2}}=planName {{3}}=phone {{4}}=email
 */
const sendPlanExpiryReminder = ({ phone, name, planName }) =>
    sendWhatsAppMessage({
        phone,
        templateName: 'plan_expiry_reminder',
        variables: [name, planName || 'Oldful Plan', SUPPORT_PHONE, SUPPORT_EMAIL],
    });

/**
 * Feedback survey after service
 * Template: feedback_survey_form — {{1}}=name
 */
const sendFeedbackSurvey = ({ phone, name }) =>
    sendWhatsAppMessage({
        phone,
        templateName: 'followup_feedback',
        variables: [name],
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
};
