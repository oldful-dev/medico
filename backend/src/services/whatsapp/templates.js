// ──────────────────────────────────────────────
//  WhatsApp Template Registry
//
//  Each entry maps a logical event key to:
//    - waba:       which WABA account to send from
//    - messageId:  Fast2SMS WABA message_id
//    - variables:  expected variable count (for validation)
//    - mediaRequired: whether media_url must be supplied
//    - docRequired:   whether document_filename must be supplied
//
//  WABA accounts:
//    AYUXA         — +918047280789 (phone_number_id: 1137788802753379)  production customer
//    AYUXA_CONSOLE — +919480198108 (phone_number_id: 1092060193998540)  admin / internal
//    AYUXA_BACKEND — Meta test number  (phone_number_id: 1104059199459456) dev / QA
// ──────────────────────────────────────────────

const WHATSAPP_TEMPLATES = {

    // ── Authentication ───────────────────────────────────────────────────
    OTP_USER: {
        waba: 'AYUXA',
        messageId: 20515,
        variables: 2,              // Var1=code, Var2=support_contact
        mediaRequired: false,
        docRequired: false,
        description: 'OTP / verification code to end-user',
    },

    // ── Onboarding ───────────────────────────────────────────────────────
    WELCOME_USER: {
        waba: 'AYUXA_BACKEND',
        messageId: 20828,
        variables: 0,
        mediaRequired: true,       // document header (welcome pack)
        docRequired: true,
        description: 'Welcome message with document attachment',
    },

    // ── Transactional (customer-facing) ──────────────────────────────────
    BOOKING_CONFIRMED: {
        waba: 'AYUXA',
        messageId: 20521,
        variables: 2,              // Var1=name, Var2=order_id
        mediaRequired: false,
        docRequired: false,
        description: 'Service booking confirmed',
    },
    PAYMENT_RECEIVED: {
        waba: 'AYUXA',
        messageId: 20520,
        variables: 2,              // Var1=name, Var2=amount
        mediaRequired: false,
        docRequired: false,
        description: 'Payment successful / receipt notification',
    },
    ORDER_CANCELLED: {
        waba: 'AYUXA',
        messageId: 20519,
        variables: 2,              // Var1=name, Var2=order_id
        mediaRequired: false,
        docRequired: false,
        description: 'Order/booking cancelled with refund note',
    },
    PRESCRIPTION_RECEIVED: {
        waba: 'AYUXA',
        messageId: 20522,
        variables: 1,              // Var1=name
        mediaRequired: false,
        docRequired: false,
        description: 'Buddy uploaded prescription — user notified',
    },
    LAB_REPORT_READY: {
        waba: 'AYUXA',
        messageId: 20512,
        variables: 1,              // Var1=name
        mediaRequired: false,
        docRequired: false,
        description: 'Blood test / lab report available in app',
    },

    // ── Marketing / Engagement ────────────────────────────────────────────
    PLAN_EXPIRY_REMINDER: {
        waba: 'AYUXA',
        messageId: 20523,
        variables: 1,              // Var1=name
        mediaRequired: false,
        docRequired: false,
        description: 'Care plan expiring — renewal CTA',
    },
    PLAN_EXPIRY_FAMILY: {
        waba: 'AYUXA_CONSOLE',
        messageId: 20831,
        variables: 1,              // Var1=name
        mediaRequired: false,
        docRequired: false,
        description: 'Plan expiry alert sent from console to family/admin',
    },
    WELLNESS_REMINDER: {
        waba: 'AYUXA_BACKEND',
        messageId: 20830,
        variables: 1,              // Var1=name
        mediaRequired: false,
        docRequired: false,
        description: 'Friendly daily wellness check-in',
    },
    BIRTHDAY_WISHES: {
        waba: 'AYUXA_BACKEND',
        messageId: 20829,
        variables: 1,              // Var1=coupon_code (copy-code button)
        mediaRequired: true,       // image header
        docRequired: false,
        description: 'Birthday message with optional offer code',
    },

    // ── Emergency / SOS ──────────────────────────────────────────────────
    SOS_ALERT: {
        waba: 'AYUXA',
        messageId: 20513,
        variables: 2,              // Var1=user_name, Var2=ayuxa_id
        mediaRequired: false,
        docRequired: false,
        description: 'SOS emergency alert to family contacts',
    },
    SOS_ALERT_ADMIN: {
        waba: 'AYUXA_CONSOLE',
        messageId: 20513,
        variables: 2,              // Var1=user_name, Var2=ayuxa_id
        mediaRequired: false,
        docRequired: false,
        description: 'SOS emergency escalation to admin/console',
    },
};

// ── WABA account config ───────────────────────────────────────────────────────
// phone_number_id comes from Fast2SMS dashboard for each WABA
const WABA_ACCOUNTS = {
    AYUXA: {
        label: 'Ayuxa Production (+918047280789)',
        phoneNumberId: process.env.FAST2SMS_WABA_PHONE_NUMBER_ID || '1137788802753379',
    },
    AYUXA_CONSOLE: {
        label: 'Ayuxa Console (+919480198108)',
        phoneNumberId: process.env.FAST2SMS_WABA_CONSOLE_PHONE_NUMBER_ID || '1092060193998540',
    },
    AYUXA_BACKEND: {
        label: 'Ayuxa Backend / Test',
        phoneNumberId: process.env.FAST2SMS_WABA_BACKEND_PHONE_NUMBER_ID || '1104059199459456',
    },
};

module.exports = { WHATSAPP_TEMPLATES, WABA_ACCOUNTS };
