// ──────────────────────────────────────────────
//  WhatsApp Event Router
//
//  High-level, typed event helpers — callers pass domain objects,
//  not raw template keys. Template keys never appear in controllers.
//
//  Each helper validates required args, then calls sendWhatsApp().
// ──────────────────────────────────────────────

const { sendWhatsApp } = require('./whatsapp.service');
const { logger } = require('../../config/logger');

const SUPPORT_PHONE = process.env.SUPPORT_PHONE || '+91 94801 98108';

// ─── Auth ─────────────────────────────────────────────────────────────────────

/**
 * Send OTP to end-user via WhatsApp.
 * Template: OTP_USER — Var1=code, Var2=support_contact
 */
const sendOTP = ({ phone, code, userId }) => {
    if (!code) { logger.warn('[WA Router] sendOTP: code is required'); return false; }
    return sendWhatsApp({
        template: 'OTP_USER',
        mobile: phone,
        variables: [String(code), SUPPORT_PHONE],
        userId,
    });
};

// ─── Onboarding ───────────────────────────────────────────────────────────────

/**
 * Send welcome message with document attachment.
 * Template: WELCOME_USER — no body variables; document header required.
 */
const sendWelcome = ({ phone, userId, mediaUrl, docFilename }) =>
    sendWhatsApp({
        template: 'WELCOME_USER',
        mobile: phone,
        variables: [],
        userId,
        mediaUrl,
        docFilename,
    });

// ─── Transactional ────────────────────────────────────────────────────────────

/**
 * Booking confirmed.
 * Template: BOOKING_CONFIRMED — Var1=name, Var2=orderId
 */
const sendBookingConfirmed = ({ phone, name, orderId, userId }) =>
    sendWhatsApp({
        template: 'BOOKING_CONFIRMED',
        mobile: phone,
        variables: [name || 'Customer', orderId || '-'],
        userId,
    });

/**
 * Payment received / receipt.
 * Template: PAYMENT_RECEIVED — Var1=name, Var2=amount (₹ prefix added)
 */
const sendPaymentReceived = ({ phone, name, amount, userId }) =>
    sendWhatsApp({
        template: 'PAYMENT_RECEIVED',
        mobile: phone,
        variables: [name || 'Customer', String(amount)],
        userId,
    });

/**
 * Order/booking cancelled.
 * Template: ORDER_CANCELLED — Var1=name, Var2=orderId
 */
const sendOrderCancelled = ({ phone, name, orderId, userId }) =>
    sendWhatsApp({
        template: 'ORDER_CANCELLED',
        mobile: phone,
        variables: [name || 'Customer', orderId || '-'],
        userId,
    });

/**
 * Prescription uploaded by buddy.
 * Template: PRESCRIPTION_RECEIVED — Var1=name
 */
const sendPrescriptionReceived = ({ phone, name, userId }) =>
    sendWhatsApp({
        template: 'PRESCRIPTION_RECEIVED',
        mobile: phone,
        variables: [name || 'Customer'],
        userId,
    });

/**
 * Lab report available in app.
 * Template: LAB_REPORT_READY — Var1=name
 */
const sendLabReportReady = ({ phone, name, userId }) =>
    sendWhatsApp({
        template: 'LAB_REPORT_READY',
        mobile: phone,
        variables: [name || 'Customer'],
        userId,
    });

// ─── Marketing / Engagement ───────────────────────────────────────────────────

/**
 * Care plan expiry reminder (customer-facing via AYUXA).
 * Template: PLAN_EXPIRY_REMINDER — Var1=name
 */
const sendPlanExpiryReminder = ({ phone, name, userId }) =>
    sendWhatsApp({
        template: 'PLAN_EXPIRY_REMINDER',
        mobile: phone,
        variables: [name || 'Customer'],
        userId,
    });

/**
 * Care plan expiry alert (admin / console via AYUXA_CONSOLE).
 * Template: PLAN_EXPIRY_FAMILY — Var1=name
 */
const sendPlanExpiryAdmin = ({ phone, name, userId }) =>
    sendWhatsApp({
        template: 'PLAN_EXPIRY_FAMILY',
        mobile: phone,
        variables: [name || 'Admin'],
        userId,
    });

/**
 * Daily wellness check-in reminder.
 * Template: WELLNESS_REMINDER — Var1=name
 */
const sendWellnessReminder = ({ phone, name, userId }) =>
    sendWhatsApp({
        template: 'WELLNESS_REMINDER',
        mobile: phone,
        variables: [name || 'Customer'],
        userId,
    });

/**
 * Birthday wishes with optional offer coupon.
 * Template: BIRTHDAY_WISHES — Var1=coupon_code; mediaUrl (image) required.
 */
const sendBirthdayWishes = ({ phone, couponCode, mediaUrl, userId }) =>
    sendWhatsApp({
        template: 'BIRTHDAY_WISHES',
        mobile: phone,
        variables: [couponCode || 'BDAY20'],
        userId,
        mediaUrl,
    });

// ─── Emergency / SOS ─────────────────────────────────────────────────────────

/**
 * SOS alert to family/contacts (via AYUXA production account).
 * Template: SOS_ALERT — Var1=user_name, Var2=ayuxa_id
 */
const sendSOSAlert = ({ phone, userName, ayuxaId, userId }) =>
    sendWhatsApp({
        template: 'SOS_ALERT',
        mobile: phone,
        variables: [userName || 'User', ayuxaId || '-'],
        userId,
    });

/**
 * SOS escalation to admin/ops team (via AYUXA_CONSOLE).
 * Template: SOS_ALERT_ADMIN — Var1=user_name, Var2=ayuxa_id
 */
const sendSOSAlertAdmin = ({ phone, userName, ayuxaId }) =>
    sendWhatsApp({
        template: 'SOS_ALERT_ADMIN',
        mobile: phone,
        variables: [userName || 'User', ayuxaId || '-'],
    });

module.exports = {
    // Auth
    sendOTP,
    // Onboarding
    sendWelcome,
    // Transactional
    sendBookingConfirmed,
    sendPaymentReceived,
    sendOrderCancelled,
    sendPrescriptionReceived,
    sendLabReportReady,
    // Marketing
    sendPlanExpiryReminder,
    sendPlanExpiryAdmin,
    sendWellnessReminder,
    sendBirthdayWishes,
    // Emergency
    sendSOSAlert,
    sendSOSAlertAdmin,
};
