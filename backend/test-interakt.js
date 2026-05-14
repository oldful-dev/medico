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

const send = async (label, templateName, bodyValues, buttonValues) => {
    const payload = {
        countryCode: '+91',
        phoneNumber,
        callbackData: `test:${templateName}`,
        type: 'Template',
        template: {
            name: templateName,
            languageCode: 'en',
            ...(bodyValues.length > 0 && { bodyValues }),
            ...(buttonValues && { buttonValues }),
        },
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

    // otp_template — {{1}}=code (AUTHENTICATION)
    await send('otp',              'otp_template',              ['1234']);

    // ayuxa_welcome — {{1}}=name (MARKETING, DOCUMENT header)
    await send('welcome',          'ayuxa_welcome',            ['Test User']);

    // service_request_ — {{1}}=name {{2}}=service {{3}}=orderId {{4}}=phone {{5}}=email (UTILITY)
    await send('booking',          'service_request_',          ['Test User', 'Doctor Home Visit', 'ORD-001', '+91 94801 98108', 'client@ayuxa.com']);

    // payment_link — {{1}}=name {{2}}=amount {{3}}=service {{4}}=paymentUrl (UTILITY)
    await send('payment_link',     'payment_link',              ['Test User', '499', 'Doctor Home Visit', 'https://ayuxa.com/pay/test']);

    // ayuxa_receipt — {{1}}=name {{2}}=amount {{3}}=phone {{4}}=email (UTILITY, DOCUMENT header)
    await send('receipt',          'ayuxa_receipt',            ['Test User', '499', '+91 94801 98108', 'client@ayuxa.com']);

    // prescription_flow — {{1}}=name {{2}}=orderRef (UTILITY)
    await send('prescription',     'prescription_flow',         ['Test User', 'RX-001']);

    // lab_report_delivery — {{1}}=name (UTILITY, DOCUMENT header)
    await send('lab_report',       'lab_report_delivery',       ['Test User']);

    // medication_reminder_daily — (no body vars) (UTILITY)
    await send('med_reminder',     'medication_reminder_daily',  []);

    // renewal_reminder — {{1}}=name {{2}}=planName {{3}}=phone {{4}}=email (MARKETING)
    await send('renewal',          'renewal_reminder',          ['Test User', 'Care Plan', '+91 94801 98108', 'client@ayuxa.com']);

    // feedback_survey_form — {{1}}=name (UTILITY)
    await send('feedback',         'feedback_survey_form',      ['Test User']);

    console.log('\nDone.');
})();
