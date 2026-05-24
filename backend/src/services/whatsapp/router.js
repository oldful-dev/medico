// ──────────────────────────────────────────────
//  WhatsApp Event Router
//
//  High-level, typed event helpers — callers pass domain objects,
//  not raw template keys. Template keys never appear in controllers.
//
//  Each helper validates required args, then calls sendWhatsApp().
//
//  WABA routing is implicit — the template registry (templates.js)
//  carries the waba field; the service resolves phoneNumberId from it.
// ──────────────────────────────────────────────

const { sendWhatsApp } = require('./whatsapp.service');
const { logger } = require('../../config/logger');

// ─── AYUXA — Client auth ──────────────────────────────────────────────────────

/**
 * Send OTP to client via WhatsApp (AYUXA).
 * Template: OTP_USER — Var1=code
 */
const sendOTP = ({ phone, code, userId }) => {
    if (!code) { logger.warn('[WA Router] sendOTP: code is required'); return false; }
    return sendWhatsApp({
        template: 'OTP_USER',
        mobile: phone,
        variables: [String(code)],
        userId,
    });
};

// ─── AYUXA_FAMILY — Family member auth ───────────────────────────────────────

/**
 * Send OTP to family member via WhatsApp (AYUXA_FAMILY).
 * Template: FAMILY_OTP — Var1=code
 */
const sendFamilyOTP = ({ phone, code }) => {
    if (!code) { logger.warn('[WA Router] sendFamilyOTP: code is required'); return false; }
    return sendWhatsApp({
        template: 'FAMILY_OTP',
        mobile: phone,
        variables: [String(code)],
    });
};

// ─── AYUXA_HQ — Employee auth ─────────────────────────────────────────────────

/**
 * Send OTP to employee/caregiver via WhatsApp (AYUXA_HQ).
 * Template: EMP_OTP — Var1=code
 */
const sendEmpOTP = ({ phone, code }) => {
    if (!code) { logger.warn('[WA Router] sendEmpOTP: code is required'); return false; }
    return sendWhatsApp({
        template: 'EMP_OTP',
        mobile: phone,
        variables: [String(code)],
    });
};

// ─── AYUXA_RELEASE — Onboarding / marketing ───────────────────────────────────

/**
 * Send welcome message with document attachment (AYUXA_RELEASE).
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

/**
 * Daily wellness check-in reminder (AYUXA_RELEASE).
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
 * Birthday wishes with offer coupon (AYUXA_RELEASE).
 * Template: BIRTHDAY_WISHES — Var1=coupon_code; image header required.
 */
const sendBirthdayWishes = ({ phone, couponCode, mediaUrl, userId }) =>
    sendWhatsApp({
        template: 'BIRTHDAY_WISHES',
        mobile: phone,
        variables: [couponCode || 'BDAY20'],
        userId,
        mediaUrl,
    });

// ─── AYUXA — Transactional (client-facing) ────────────────────────────────────

/**
 * Booking confirmed.
 * Template: BOOKING_CONFIRMED — Var1=name, Var2=order_id
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
 * Template: PAYMENT_RECEIVED — Var1=name, Var2=amount
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
 * Template: ORDER_CANCELLED — Var1=name, Var2=order_id
 */
const sendOrderCancelled = ({ phone, name, orderId, userId }) =>
    sendWhatsApp({
        template: 'ORDER_CANCELLED',
        mobile: phone,
        variables: [name || 'Customer', orderId || '-'],
        userId,
    });

/**
 * Prescription uploaded by buddy — client notified.
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

/**
 * Care plan expiry reminder to client.
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
 * SOS triggered — confirmation/alert to client's emergency contacts (AYUXA).
 * Template: SOS_ALERT_CLIENT — Var1=user_name, Var2=ayuxa_id (packed with location details)
 */
const sendSOSAlertClient = ({ phone, userName, ayuxaId, userId }) =>
    sendWhatsApp({
        template: 'SOS_ALERT_CLIENT',
        mobile: phone,
        variables: [userName || 'User', ayuxaId || '-'],
        userId,
    });

// ─── AYUXA_FAMILY — Family notifications ──────────────────────────────────────

/**
 * SOS triggered by family member — family notified (AYUXA_FAMILY).
 * Template: SOS_ALERT_FAMILY — no variables (fixed message)
 */
const sendSOSAlertFamily = ({ phone }) =>
    sendWhatsApp({
        template: 'SOS_ALERT_FAMILY',
        mobile: phone,
        variables: [],
    });

/**
 * Client care plan cancelled/expired — family notified (AYUXA_FAMILY).
 * Template: PLAN_EXPIRED_FAMILY — Var1=family_name, Var2=client_name, Var3=ayuxa_id
 */
const sendPlanExpiredFamily = ({ phone, familyName, clientName, ayuxaId }) =>
    sendWhatsApp({
        template: 'PLAN_EXPIRED_FAMILY',
        mobile: phone,
        variables: [familyName || 'Member', clientName || 'Client', ayuxaId || '-'],
    });

/**
 * Client care plan expiring — family reminder (AYUXA_FAMILY).
 * Template: PLAN_EXPIRY_FAMILY — Var1=family_name, Var2=ayuxa_id
 */
const sendPlanExpiryFamily = ({ phone, familyName, ayuxaId }) =>
    sendWhatsApp({
        template: 'PLAN_EXPIRY_FAMILY',
        mobile: phone,
        variables: [familyName || 'Member', ayuxaId || '-'],
    });

/**
 * Weekly health dashboard reminder to family (AYUXA_FAMILY).
 * Template: HEALTH_CHECK_FAMILY — Var1=client_name
 */
const sendHealthCheckFamily = ({ phone, clientName }) =>
    sendWhatsApp({
        template: 'HEALTH_CHECK_FAMILY',
        mobile: phone,
        variables: [clientName || 'your loved one'],
    });

/**
 * Prescription uploaded by buddy — family notified with photo (AYUXA_FAMILY).
 * Template: PRESCRIPTION_UPLOADED_FAMILY — Var1=family_name; image header required.
 */
const sendPrescriptionUploadedFamily = ({ phone, familyName, mediaUrl }) =>
    sendWhatsApp({
        template: 'PRESCRIPTION_UPLOADED_FAMILY',
        mobile: phone,
        variables: [familyName || 'Member'],
        mediaUrl,
    });

// ─── AYUXA_HQ — Employee / caregiver notifications ───────────────────────────

/**
 * New shift assigned to employee (AYUXA_HQ).
 * Template: SHIFT_ASSIGNED — Var1=emp_name, Var2=client_name, Var3=client_id, Var4=date, Var5=time
 */
const sendShiftAssigned = ({ phone, empName, clientName, clientId, date, time }) =>
    sendWhatsApp({
        template: 'SHIFT_ASSIGNED',
        mobile: phone,
        variables: [
            empName  || 'Caregiver',
            clientName || 'Client',
            clientId   || '-',
            date       || '-',
            time       || '-',
        ],
    });

/**
 * SOS emergency dispatch to assigned caregiver (AYUXA_HQ).
 * Template: SOS_DISPATCH — Var1=emp_name, Var2=client_name, Var3=client_id
 */
const sendSOSDispatch = ({ phone, empName, clientName, clientId }) =>
    sendWhatsApp({
        template: 'SOS_DISPATCH',
        mobile: phone,
        variables: [empName || 'Caregiver', clientName || 'Client', clientId || '-'],
    });

/**
 * Shift cancelled — employee notified (AYUXA_HQ).
 * Template: SHIFT_CANCELLED — Var1=emp_name, Var2=client_name, Var3=client_id, Var4=date
 */
const sendShiftCancelledWA = ({ phone, empName, clientName, clientId, date }) =>
    sendWhatsApp({
        template: 'SHIFT_CANCELLED',
        mobile: phone,
        variables: [
            empName    || 'Caregiver',
            clientName || 'Client',
            clientId   || '-',
            date       || '-',
        ],
    });

// ─── AYUXA_ALERT — SOS / emergency / ops ──────────────────────────────────────

/**
 * SOS urgent alert to Ayuxa ops/admin team (AYUXA_ALERT).
 * Template: SOS_ALERT_OPS — Var1=client_name, Var2=client_id (packed with location details)
 */
const sendSOSAlertOps = ({ phone, userName, ayuxaId }) =>
    sendWhatsApp({
        template: 'SOS_ALERT_OPS',
        mobile: phone,
        variables: [userName || 'User', ayuxaId || '-'],
    });

module.exports = {
    // Auth
    sendOTP,
    sendFamilyOTP,
    sendEmpOTP,

    // Onboarding / marketing (AYUXA_RELEASE)
    sendWelcome,
    sendWellnessReminder,
    sendBirthdayWishes,

    // Transactional — client (AYUXA)
    sendBookingConfirmed,
    sendPaymentReceived,
    sendOrderCancelled,
    sendPrescriptionReceived,
    sendLabReportReady,
    sendPlanExpiryReminder,
    sendSOSAlertClient,

    // Family (AYUXA_FAMILY)
    sendSOSAlertFamily,
    sendPlanExpiredFamily,
    sendPlanExpiryFamily,
    sendHealthCheckFamily,
    sendPrescriptionUploadedFamily,

    // Employee / caregiver (AYUXA_HQ)
    sendShiftAssigned,
    sendSOSDispatch,
    sendShiftCancelledWA,

    // Ops / emergency (AYUXA_ALERT)
    sendSOSAlertOps,
};
