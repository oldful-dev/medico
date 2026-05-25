// ──────────────────────────────────────────────
//  DLT SMS Template Registry
//  All approved Fast2SMS DLT templates for every sender ID.
//
//  variables: number of {#var#} placeholders in the template text.
//  text:      stored for local logging / idempotency key generation only;
//             Fast2SMS ignores it (uses its own copy from DLT registry).
// ──────────────────────────────────────────────

const SMS_TEMPLATES = {

    // ── Sender: AYUXA ────────────────────────────────────────────────────

    OTP_USER: {
        senderId: 'AYUXA',
        templateId: '215237',
        variables: 1,
        text: '{#var#} is your Ayuxa code. Do not share. Team Ayuxa.',
    },
    ORDER_CONFIRMED: {
        senderId: 'AYUXA',
        templateId: '215239',
        variables: 3,
        text: 'Dear {#var#}, your order {#var#} is confirmed. Support: {#var#}. Team Ayuxa.',
    },
    PAYMENT_RECEIVED: {
        senderId: 'AYUXA',
        templateId: '215352',
        variables: 2,
        text: "Dear {#var#}, We've received your ₹{#var#} payment. Receipt in app. Team Ayuxa.",
    },
    BUDDY_ASSIGNED: {
        senderId: 'AYUXA',
        templateId: '215395',
        variables: 1,
        text: 'Dear {#var#}, Ayuxa Buddy is now assigned to you. See Ayuxa app. Team Ayuxa.',
    },
    WELLNESS_CHECKIN: {
        senderId: 'AYUXA',
        templateId: '215397',
        variables: 1,
        text: 'Dear {#var#}, a quick check-in! Drink water, take a short walk. Team Ayuxa.',
    },
    MEDICINE_OUT_FOR_DELIVERY: {
        senderId: 'AYUXA',
        templateId: '215398',
        variables: 3,
        text: 'Dear {#var#}, medicine order {#var#} is out for delivery by {#var#}. Team Ayuxa.',
    },
    LAB_REPORT_READY: {
        senderId: 'AYUXA',
        templateId: '215399',
        variables: 1,
        text: 'Dear {#var#}, your lab reports are ready. View in Ayuxa app. Team Ayuxa.',
    },
    WELCOME_USER: {
        senderId: 'AYUXA',
        templateId: '215420',
        variables: 1,
        text: 'Dear {#var#}, Welcome to Ayuxa! Thrilled to be your healthcare partner. Team Ayuxa.',
    },
    SOS_FAMILY: {
        senderId: 'AYUXA',
        templateId: '215594',
        variables: 2,
        text: 'Dear {#var#}, SOS triggered by {#var#} in Ayuxa. Please act immediately. Team Ayuxa.',
    },
    PLAN_EXPIRED_USER: {
        senderId: 'AYUXA',
        templateId: '215595',
        variables: 2,
        text: 'Dear {#var#}, Your care plan has expired. Contact {#var#}. Team Ayuxa.',
    },
    ORDER_CANCELLED_USER: {
        senderId: 'AYUXA',
        templateId: '215600',
        variables: 2,
        text: 'Dear {#var#}, order {#var#} cancelled. Refund in 3-5 days. Team Ayuxa.',
    },
    PLAN_CANCELLED_WITH_CONTACT: {
        senderId: 'AYUXA',
        templateId: '215602',
        variables: 2,
        text: 'Dear {#var#}, care plan cancelled/expired. Contact {#var#}. Team Ayuxa.',
    },

    // ── Sender: AYUXAH (Employees / Caregivers) ──────────────────────────

    CAREGIVER_OTP: {
        senderId: 'AYUXAH',
        templateId: '215671',
        variables: 1,
        text: '{#var#} is your Ayuxa Platform login code. Never share this code with anyone. Ayuxa HQ.',
    },
    SOS_PARTNER: {
        senderId: 'AYUXAH',
        templateId: '215598',
        variables: 1,
        text: 'EMERGENCY DISPATCH: SOS triggered Client ID {#var#}, proceed immediately. Ayuxa HQ.',
    },
    SHIFT_CANCELLED_PARTNER: {
        senderId: 'AYUXAH',
        templateId: '215599',
        variables: 4,
        text: 'Dear {#var#}, shift with client {#var#} ID {#var#} on {#var#} cancelled. Ayuxa HQ.',
    },

    // ── Sender: AYUXHO (Client Families + SOS contacts) ──────────────────

    SOS_ADMIN: {
        senderId: 'AYUXHO',
        templateId: '215601',
        variables: 2,
        text: 'Dear {#var#}, SOS triggered by {#var#} in Ayuxa. Please take immediate action. Team Ayuxa.',
    },

    // ── Sender: AYUXAH continued (Admin staff = employees) ────────────────

    ADMIN_LOGIN_OTP: {
        senderId: 'AYUXAH',
        templateId: '215596',
        variables: 1,
        text: '{#var#} is your Ayuxa platform login code. Do not share. Team Ayuxa.',
    },
    PLAN_CANCELLED_ADMIN: {
        senderId: 'AYUXAH',
        templateId: '215597',
        variables: 3,
        text: 'Dear {#var#}, care plan for {#var#} cancelled/expired. Contact {#var#}. Team Ayuxa.',
    },
};

module.exports = { SMS_TEMPLATES };
