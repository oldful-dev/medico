// ──────────────────────────────────────────────
//  WhatsApp Template Registry
//
//  5 WABA accounts — each serves a distinct audience:
//
//  AYUXA         (+918047280789,  pnId: 1137788802753379)  → Clients (transactional)
//  AYUXA_FAMILY  (+1555-973-5639, pnId: 1193813770471315)  → Client family members
//  AYUXA_RELEASE (+1555-958-2674, pnId: 1104059199459456)  → Marketing / promotions
//  AYUXA_HQ      (+918031619197,  pnId: 1033856123155360)  → Employees / caregivers
//  AYUXA_ALERT   (+919480198108,  pnId: 1159357623920509)  → SOS / emergency / ops
// ──────────────────────────────────────────────

const WHATSAPP_TEMPLATES = {

    // ════════════════════════════════════════════
    //  AYUXA — Client communication
    // ════════════════════════════════════════════

    OTP_USER: {
        waba: 'AYUXA',
        messageId: 20936,
        variables: 1,              // Var1=code
        mediaRequired: false,
        docRequired: false,
        description: 'Verification OTP to client',
    },
    BOOKING_CONFIRMED: {
        waba: 'AYUXA',
        messageId: 20521,
        variables: 2,              // Var1=name, Var2=order_id
        mediaRequired: false,
        docRequired: false,
        description: 'Service booking confirmed to client',
    },
    PAYMENT_RECEIVED: {
        waba: 'AYUXA',
        messageId: 20520,
        variables: 2,              // Var1=name, Var2=amount
        mediaRequired: false,
        docRequired: false,
        description: 'Payment successful receipt to client',
    },
    ORDER_CANCELLED: {
        waba: 'AYUXA',
        messageId: 20519,
        variables: 2,              // Var1=name, Var2=order_id
        mediaRequired: false,
        docRequired: false,
        description: 'Order/booking cancelled with refund note to client',
    },
    PRESCRIPTION_RECEIVED: {
        waba: 'AYUXA',
        messageId: 20522,
        variables: 1,              // Var1=name
        mediaRequired: false,
        docRequired: false,
        description: 'Buddy uploaded prescription — client notified',
    },
    LAB_REPORT_READY: {
        waba: 'AYUXA',
        messageId: 20512,
        variables: 1,              // Var1=name
        mediaRequired: false,
        docRequired: false,
        description: 'Lab report available in app — client notified',
    },
    PLAN_EXPIRY_REMINDER: {
        waba: 'AYUXA',
        messageId: 20523,
        variables: 1,              // Var1=name
        mediaRequired: false,
        docRequired: false,
        description: 'Care plan expiring soon — renewal CTA to client',
    },
    SOS_ALERT_CLIENT: {
        waba: 'AYUXA',
        messageId: 20513,
        variables: 2,              // Var1=user_name, Var2=ayuxa_id
        mediaRequired: false,
        docRequired: false,
        description: 'SOS triggered — confirmation/alert sent to client\'s emergency contacts',
    },

    // ════════════════════════════════════════════
    //  AYUXA_FAMILY — Client family members
    // ════════════════════════════════════════════

    FAMILY_OTP: {
        waba: 'AYUXA_FAMILY',
        messageId: 20912,
        variables: 1,              // Var1=code
        mediaRequired: false,
        docRequired: false,
        description: 'Login OTP to family member',
    },
    SOS_ALERT_FAMILY: {
        waba: 'AYUXA_FAMILY',
        messageId: 20899,
        variables: 0,              // No variables — fixed message
        mediaRequired: false,
        docRequired: false,
        description: 'SOS triggered by family member — family notified',
    },
    PLAN_EXPIRED_FAMILY: {
        waba: 'AYUXA_FAMILY',
        messageId: 20897,
        variables: 3,              // Var1=family_name, Var2=client_name, Var3=ayuxa_id
        mediaRequired: false,
        docRequired: false,
        description: 'Client care plan cancelled/expired — family notified',
    },
    PLAN_EXPIRY_FAMILY: {
        waba: 'AYUXA_FAMILY',
        messageId: 20898,
        variables: 2,              // Var1=family_name, Var2=ayuxa_id
        mediaRequired: false,
        docRequired: false,
        description: 'Client care plan expiring — family reminder',
    },
    HEALTH_CHECK_FAMILY: {
        waba: 'AYUXA_FAMILY',
        messageId: 20911,
        variables: 1,              // Var1=client_name
        mediaRequired: false,
        docRequired: false,
        description: 'Weekly health dashboard reminder to family',
    },
    PRESCRIPTION_UPLOADED_FAMILY: {
        waba: 'AYUXA_FAMILY',
        messageId: 20937,
        variables: 1,              // Var1=family_name
        mediaRequired: true,       // image header (prescription photo)
        docRequired: false,
        description: 'Prescription uploaded by buddy — family notified',
    },

    // ════════════════════════════════════════════
    //  AYUXA_RELEASE — Marketing / promotions
    // ════════════════════════════════════════════

    WELCOME_USER: {
        waba: 'AYUXA_RELEASE',
        messageId: 20828,
        variables: 0,
        mediaRequired: true,       // document header (welcome pack)
        docRequired: true,
        description: 'Welcome message with document attachment — marketing',
    },
    WELLNESS_REMINDER: {
        waba: 'AYUXA_RELEASE',
        messageId: 20830,
        variables: 1,              // Var1=name
        mediaRequired: false,
        docRequired: false,
        description: 'Friendly daily wellness check-in — marketing',
    },
    BIRTHDAY_WISHES: {
        waba: 'AYUXA_RELEASE',
        messageId: 20829,
        variables: 1,              // Var1=coupon_code
        mediaRequired: true,       // image header
        docRequired: false,
        description: 'Birthday message with coupon — marketing',
    },

    // ════════════════════════════════════════════
    //  AYUXA_HQ — Employees / caregivers
    // ════════════════════════════════════════════

    EMP_OTP: {
        waba: 'AYUXA_HQ',
        messageId: 20913,
        variables: 1,              // Var1=code
        mediaRequired: false,
        docRequired: false,
        description: 'Login OTP to employee/caregiver',
    },
    SHIFT_ASSIGNED: {
        waba: 'AYUXA_HQ',
        messageId: 20931,
        variables: 5,              // Var1=emp_name, Var2=client_name, Var3=client_id, Var4=date, Var5=time
        mediaRequired: false,
        docRequired: false,
        description: 'New shift assigned — employee notified',
    },
    SOS_DISPATCH: {
        waba: 'AYUXA_HQ',
        messageId: 20932,
        variables: 3,              // Var1=emp_name, Var2=client_name, Var3=client_id
        mediaRequired: false,
        docRequired: false,
        description: 'SOS emergency dispatch to assigned caregiver',
    },
    SHIFT_CANCELLED: {
        waba: 'AYUXA_HQ',
        messageId: 20933,
        variables: 4,              // Var1=emp_name, Var2=client_name, Var3=client_id, Var4=date
        mediaRequired: false,
        docRequired: false,
        description: 'Shift cancelled — employee notified',
    },

    // ════════════════════════════════════════════
    //  AYUXA_ALERT — SOS / emergency / ops
    // ════════════════════════════════════════════

    SOS_ALERT_OPS: {
        waba: 'AYUXA_ALERT',
        messageId: 20906,
        variables: 2,              // Var1=client_name, Var2=client_id
        mediaRequired: false,
        docRequired: false,
        description: 'SOS urgent alert to Ayuxa ops/admin team',
    },
};

// ── WABA account config ───────────────────────────────────────────────────────
const WABA_ACCOUNTS = {
    AYUXA: {
        label: 'Ayuxa (+918047280789)',
        phoneNumberId: process.env.FAST2SMS_WABA_AYUXA_PHONE_NUMBER_ID || '1137788802753379',
    },
    AYUXA_FAMILY: {
        label: 'Ayuxa Backend (+1555-973-5639)',
        phoneNumberId: process.env.FAST2SMS_WABA_FAMILY_PHONE_NUMBER_ID || '1193813770471315',
    },
    AYUXA_RELEASE: {
        label: 'Ayuxa Release (+1555-958-2674)',
        phoneNumberId: process.env.FAST2SMS_WABA_RELEASE_PHONE_NUMBER_ID || '1104059199459456',
    },
    AYUXA_HQ: {
        label: 'Ayuxa HQ (+918031619197)',
        phoneNumberId: process.env.FAST2SMS_WABA_HQ_PHONE_NUMBER_ID || '1033856123155360',
    },
    AYUXA_ALERT: {
        label: 'Ayuxa Alert (+919480198108)',
        phoneNumberId: process.env.FAST2SMS_WABA_ALERT_PHONE_NUMBER_ID || '1159357623920509',
    },
};

module.exports = { WHATSAPP_TEMPLATES, WABA_ACCOUNTS };
