// ──────────────────────────────────────────────
//  Interakt Integration Test — uses real approved templates
//  Run: node test-interakt.js <phone>
//  Example: node test-interakt.js 9876543210
// ──────────────────────────────────────────────

require('dotenv').config();
const axios = require('axios');

const phone = process.argv[2];
if (!phone) {
    console.error('Usage: node test-interakt.js <10-digit-phone>');
    process.exit(1);
}

const apiKey = process.env.INTERAKT_API_KEY;
if (!apiKey) { console.error('INTERAKT_API_KEY not set'); process.exit(1); }

const BASE_URL = 'https://api.interakt.ai/v1/public/message/';
const phoneNumber = phone.replace(/\D/g, '').slice(-10);

const send = async (label, templateName, bodyValues) => {
    const payload = {
        countryCode: '+91',
        phoneNumber,
        callbackData: `test:${templateName}`,
        type: 'Template',
        template: { name: templateName, languageCode: 'en', bodyValues },
    };
    try {
        const r = await axios.post(BASE_URL, payload, {
            headers: { Authorization: `Basic ${apiKey}`, 'Content-Type': 'application/json' },
            timeout: 10000,
        });
        const ok = r.data?.result === true;
        console.log(`${ok ? '✅' : '⚠️ '} [${label}] ${r.data?.message}`);
        return ok;
    } catch (e) {
        console.log(`❌ [${label}] ${e.response?.status} — ${e.response?.data?.message || e.message}`);
        return false;
    }
};

(async () => {
    console.log(`\nTesting Interakt → +91${phoneNumber}\n`);

    await send('welcome',       'oldful_welcome_message',          ['Test User']);
    await send('booking',       'oldful_appointment_confirmation',  ['Test User', '29 Mar 2026, 10:00 AM', 'Doctor Home Visit']);
    await send('payment',       'oldful_payment_confirmation',      ['Test User', '₹499']);
    await send('plan_expiry',   'oldful_health_event_reminder',     ['Test User', '05 Apr 2026 (7 days left)']);
    await send('support',       'oldful_customer_support',          ['Test User']);
    await send('prescription',  'oldful_prescription_reminder',     ['Test User']);
    await send('health_tip',    'oldful_health_tips',               ['Test User', 'Drink 8 glasses of water daily and take a 30-min walk.']);

    console.log('\nDone.');
})();
