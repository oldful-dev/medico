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
// Template reference (as of 2026-03-28):
//
//  oldful_welcome_message          UTILITY    {{1}}=name
//  oldful_appointment_confirmation TRANSACTIONAL {{1}}=name {{2}}=date {{3}}=service
//  oldful_payment_confirmation     TRANSACTIONAL {{1}}=name {{2}}=amount
//  oldful_customer_support         UTILITY    {{1}}=name
//  oldful_health_event_reminder    UTILITY    {{1}}=name {{2}}=date
//  oldful_followup_feedback        UTILITY    {{1}}=name
//  oldful_health_tips              MARKETING  {{1}}=name {{2}}=tip
//  oldful_new_service_launch       MARKETING  {{1}}=name {{2}}=service
//  oldful_service_update           UTILITY    {{1}}=name {{2}}=date {{3}}=reason
//  oldful_prescription_reminder    UTILITY    {{1}}=name
//  oldful_lead_qualification       UTILITY    {{1}}=name
//  oldful_event_invite             MARKETING  {{1}}=name {{2}}=date
//  oldful_health_program_invite    MARKETING  {{1}}=name
//  oldful_covid_safety_update      UTILITY    {{1}}=name
//
const TEMPLATES = {
    // ── Core transactional ──
    welcome_message:         'oldful_welcome_message',
    booking_confirmation:    'oldful_appointment_confirmation',
    payment_confirmation:    'oldful_payment_confirmation',
    invoice_confirmation:    'oldful_payment_confirmation',

    // ── SOS / emergency ──
    // No dedicated SOS template — use customer_support with name
    sos_alert_admin:         'oldful_customer_support',
    sos_alert_family:        'oldful_customer_support',

    // ── Plan / subscription ──
    // Plan expiry uses health_event_reminder: {{1}}=name {{2}}=expiry_date
    plan_expiry_reminder:    'oldful_health_event_reminder',

    // ── Support & feedback ──
    support_reply:           'oldful_customer_support',
    followup_feedback:       'oldful_followup_feedback',

    // ── Marketing / campaigns ──
    health_tips:             'oldful_health_tips',
    new_service_launch:      'oldful_new_service_launch',
    service_update:          'oldful_service_update',
    event_invite:            'oldful_event_invite',
    health_program_invite:   'oldful_health_program_invite',
    prescription_reminder:   'oldful_prescription_reminder',
    lead_qualification:      'oldful_lead_qualification',
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

/**
 * Welcome after signup
 * Template: oldful_welcome_message — {{1}}=name
 */
const sendWelcome = ({ phone, name }) =>
    sendWhatsAppMessage({
        phone,
        templateName: 'welcome_message',
        variables: [name],
    });

/**
 * Booking / appointment confirmed
 * Template: oldful_appointment_confirmation — {{1}}=name {{2}}=datetime {{3}}=service
 */
const sendBookingConfirmation = ({ phone, name, dateTime, service }) =>
    sendWhatsAppMessage({
        phone,
        templateName: 'booking_confirmation',
        variables: [name, dateTime || 'shortly', service || 'your requested service'],
    });

/**
 * Payment received / invoice
 * Template: oldful_payment_confirmation — {{1}}=name {{2}}=amount
 */
const sendPaymentConfirmation = ({ phone, name, amount }) =>
    sendWhatsAppMessage({
        phone,
        templateName: 'payment_confirmation',
        variables: [name, `₹${amount}`],
    });

/**
 * SOS — admin alert
 * Template: oldful_customer_support — {{1}}=name
 * (No dedicated SOS template; admin is also notified via email with full details)
 */
const sendSOSAdmin = ({ phone, userName }) =>
    sendWhatsAppMessage({
        phone,
        templateName: 'sos_alert_admin',
        variables: [userName],
    });

/**
 * SOS — family contact alert
 * Template: oldful_customer_support — {{1}}=contactName
 */
const sendSOSFamily = ({ phone, contactName }) =>
    sendWhatsAppMessage({
        phone,
        templateName: 'sos_alert_family',
        variables: [contactName],
    });

/**
 * Plan expiry reminder
 * Template: oldful_health_event_reminder — {{1}}=name {{2}}=expiryDate
 */
const sendPlanExpiryReminder = ({ phone, name, expiryDate }) =>
    sendWhatsAppMessage({
        phone,
        templateName: 'plan_expiry_reminder',
        variables: [name, expiryDate],
    });

/**
 * Support / follow-up after ticket
 * Template: oldful_customer_support — {{1}}=name
 */
const sendSupportReply = ({ phone, name }) =>
    sendWhatsAppMessage({
        phone,
        templateName: 'support_reply',
        variables: [name],
    });

/**
 * Prescription reminder
 * Template: oldful_prescription_reminder — {{1}}=name
 */
const sendPrescriptionReminder = ({ phone, name }) =>
    sendWhatsAppMessage({
        phone,
        templateName: 'prescription_reminder',
        variables: [name],
    });

/**
 * Generic campaign / bulk outreach
 * Template: oldful_health_tips — {{1}}=name {{2}}=tipText
 */
const sendCampaignMessage = ({ phone, name, message }) =>
    sendWhatsAppMessage({
        phone,
        templateName: 'health_tips',
        variables: [name, message || ''],
    });

module.exports = {
    // Low-level — use when no helper exists
    sendWhatsAppMessage,
    TEMPLATES,

    // High-level helpers
    sendWelcome,
    sendBookingConfirmation,
    sendPaymentConfirmation,
    sendSOSAdmin,
    sendSOSFamily,
    sendPlanExpiryReminder,
    sendSupportReply,
    sendPrescriptionReminder,
    sendCampaignMessage,
};
