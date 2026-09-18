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
    // BROKEN — messageId 20513 does not exist in the approved Fast2SMS
    // WhatsApp template list (verified against the portal export). Sending
    // fails with "invalid or not approved". Superseded by SOS_ALERT_FAMILY
    // (messageId 20899, AYUXA_FAMILY) for the emergency-contact WhatsApp
    // alert — see sos.controller.js. Kept only because interakt.service.js
    // (legacy shim) and utils/test-whatsapp.js still reference it.
    SOS_ALERT_CLIENT: {
        waba: 'AYUXA',
        messageId: 20513,
        variables: 2,              // Var1=user_name, Var2=ayuxa_id
        mediaRequired: false,
        docRequired: false,
        description: 'SOS triggered — confirmation/alert sent to client\'s emergency contacts',
    },
    // Corrected re-registration of the welcome flow — the original send was
    // meant to go out as "Ayuxa" (this AYUXA waba), not "Ayuxa Backend"
    // (AYUXA_FAMILY); Fast2SMS registered it here correctly. Approved and
    // live — this is now the welcome flow's WhatsApp template (see
    // utils/notifications.js's sendWelcomeNotifications). Replaces the old
    // WELCOME_USER (AYUXA_RELEASE, 20828), which was never an approved
    // template on that number.
    WELCOME_FLOW_V2: {
        waba: 'AYUXA',
        messageId: 33129,
        templateId: '33129',
        name: 'welcome_flow',
        variables: 2,              // Var1=name, Var2=Ayuxa ID
        mediaRequired: false,
        docRequired: true,        // document header — same SLA PDF as WELCOME_USER
        description: 'Welcome message with SLA document, sends as "Ayuxa"',
    },

    // ════════════════════════════════════════════
    //  AYUXA_FAMILY — Client family members & Order Notifications (+1555-973-5639)
    // ════════════════════════════════════════════

    AYUXA_BACKEND_ORDER: {
        waba: 'AYUXA_FAMILY',
        messageId: 27945,
        templateId: '1387588400132497',
        name: 'ayuxa_backend_order',
        variables: 6,              // Var1=Client Name, Var2=Order ID, Var3=State, Var4=Service Requested, Var5=Received At, Var6=Schedule On
        mediaRequired: false,
        docRequired: false,
        description: 'New Order Alert via +1555-973-5639',
    },
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
    SOS_OFFICE: {
        waba: 'AYUXA_FAMILY',
        messageId: 27213,
        variables: 3,              // Var1=client_name, Var2=client_id, Var3=client_mobile
        mediaRequired: false,
        docRequired: false,
        description: 'EMERGENCY SOS TRIGGERED — alert sent to office/admin from family sender',
    },

    // ── Marketing/broadcast templates registered on AYUXA_FAMILY, not
    // AYUXA_RELEASE — Fast2SMS registered these under this number, so they
    // must send from here, not the AYUXA_RELEASE section below. Client
    // instruction: keep these WhatsApp + Email only, never SMS.
    ANNOUNCEMENT_UPDATE: {
        waba: 'AYUXA_FAMILY',
        messageId: 32999,
        templateId: '32999',
        name: 'annpuncement',
        variables: 2,              // Var1=name, Var2=app deep-link slug
        mediaRequired: true,       // image header
        docRequired: false,
        campaignEligible: true,
        description: 'General announcement / important update — marketing (the "Update" template)',
    },
    PROMO_OFFER: {
        waba: 'AYUXA_FAMILY',
        messageId: 33003,
        templateId: '33003',
        name: 'promo_offer',
        variables: 2,              // Var1=name, Var2=discount (e.g. "20%")
        mediaRequired: false,
        docRequired: false,
        campaignEligible: true,
        description: 'Discount/offer announcement — marketing',
    },
    BIRTHDAY_WISHES_FAMILY: {
        waba: 'AYUXA_FAMILY',
        messageId: 33000,
        templateId: '33000',
        name: 'happy_birthday',
        variables: 0,              // registered with a broken {{}} placeholder, not a real Var1 slot
        mediaRequired: true,       // image header — see assets/documents/ or the birthday image asset
        docRequired: false,
        description: 'Birthday wish (AYUXA_FAMILY variant) — marketing. Prefer BIRTHDAY_WISHES (AYUXA_RELEASE, msgId 20829) for the automated cron send; this is the alternate approved template on the family number.',
    },
    // PENDING at Fast2SMS as of this registration — sending will fail until
    // Fast2SMS approves it. Wired in per explicit instruction ("integrate
    // all of them, dont care abt pending"); do not use for the automated
    // welcome flow (utils/notifications.js) until status flips to approved —
    // that flow already uses the working WELCOME_USER (AYUXA_RELEASE, 20828).
    WELCOME_FLOW_FAMILY: {
        waba: 'AYUXA_FAMILY',
        messageId: 33001,
        templateId: '33001',
        name: 'welcome_flow',
        variables: 2,              // Var1=name, Var2=Ayuxa ID
        mediaRequired: false,
        docRequired: true,        // document header — same SLA PDF as email/WELCOME_USER
        pending: true,
        description: 'Welcome message with SLA document (AYUXA_FAMILY variant) — PENDING Fast2SMS approval',
    },
    WELLNESS_REMINDER_FAMILY: {
        waba: 'AYUXA_FAMILY',
        messageId: 33121,
        templateId: '33121',
        name: 'friendly_remember',
        variables: 1,              // Var1=name
        mediaRequired: false,
        docRequired: false,
        campaignEligible: true,
        description: 'Friendly wellness check-in (AYUXA_FAMILY variant) — marketing. Same content as WELLNESS_REMINDER (AYUXA_RELEASE, 20830), re-registered under this number.',
    },
    // "WhatsApp Channel" template — explicit client request to add this to
    // Notification Management. Points customers at Ayuxa's public WhatsApp
    // channel for health updates/announcements/fraud-awareness content.
    WHATSAPP_CHANNEL: {
        waba: 'AYUXA_FAMILY',
        messageId: 33122,
        templateId: '33122',
        name: 'whatsapp_channel',
        variables: 2,              // Var1=name, Var2=deep-link slug (button URL)
        mediaRequired: false,
        docRequired: false,
        campaignEligible: true,
        description: 'Invites customer to follow the Ayuxa WhatsApp Channel — marketing',
    },
    // SOS resolved — sent to the client themselves once their SOS is
    // marked RESOLVED.
    SOS_RESOLVED_CLIENT: {
        waba: 'AYUXA_FAMILY',
        messageId: 33302,
        templateId: '1091340266614348',
        name: 'sos_alert_resolved',
        variables: 1,              // Var1=client name
        mediaRequired: false,
        docRequired: false,
        description: 'SOS resolved — confirmation sent to the client',
    },
    // SOS resolved — sent to the client's emergency contact (family member).
    SOS_RESOLVED_FAMILY: {
        waba: 'AYUXA_FAMILY',
        messageId: 33301,
        templateId: '2086279819430815',
        name: 'sos_triggered_resolved_family',
        variables: 2,              // Var1=family member (recipient) name, Var2=who triggered it (client)
        mediaRequired: false,
        docRequired: false,
        description: 'SOS resolved — confirmation sent to the family/emergency contact',
    },

    // ════════════════════════════════════════════
    //  AYUXA_RELEASE — Marketing / promotions
    // ════════════════════════════════════════════

    // LIKELY BROKEN — messageId 20828 does not appear in the approved
    // Fast2SMS WhatsApp template list for AYUXA_RELEASE (verified against
    // the portal export, same as WELLNESS_REMINDER/20830 and
    // BIRTHDAY_WISHES/20829 below — this whole AYUXA_RELEASE number had
    // zero templates in every export shared this session). Superseded by
    // WELCOME_FLOW_V2 (AYUXA, 33129) for the live welcome flow. Kept only
    // because interakt.service.js (legacy shim) still references it.
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
        campaignEligible: true,
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
    // Replaces the old SOS_DISPATCH (20932, AYUXA_HQ) per explicit instruction
    // — caregiver dispatch now uses this approved AYUXA_FAMILY template.
    SOS_DISPATCH: {
        waba: 'AYUXA_FAMILY',
        messageId: 33131,
        templateId: '33131',
        name: 'emergency_dispatch_',
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
        phoneNumberId: process.env.FAST2SMS_WABA_AYUXA_PHONE_NUMBER_ID,
    },
    AYUXA_FAMILY: {
        label: 'Ayuxa Backend (+1555-973-5639)',
        phoneNumberId: process.env.FAST2SMS_WABA_FAMILY_PHONE_NUMBER_ID,
    },
    AYUXA_RELEASE: {
        label: 'Ayuxa Release (+1555-958-2674)',
        phoneNumberId: process.env.FAST2SMS_WABA_RELEASE_PHONE_NUMBER_ID,
    },
    AYUXA_HQ: {
        label: 'Ayuxa HQ (+918031619197)',
        phoneNumberId: process.env.FAST2SMS_WABA_HQ_PHONE_NUMBER_ID,
    },
    AYUXA_ALERT: {
        label: 'Ayuxa Alert (+919480198108)',
        phoneNumberId: process.env.FAST2SMS_WABA_ALERT_PHONE_NUMBER_ID,
    },
};

module.exports = { WHATSAPP_TEMPLATES, WABA_ACCOUNTS };
