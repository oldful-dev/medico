// ──────────────────────────────────────────────
//  Fast2SMS WABA WhatsApp Test Utility
//  Use this to test WhatsApp templates without triggering business logic
// ──────────────────────────────────────────────

const axios = require('axios');
const { WHATSAPP_TEMPLATES, WABA_ACCOUNTS } = require('../services/whatsapp/templates');

const WHATSAPP_URL = 'https://www.fast2sms.com/dev/whatsapp';

/**
 * Test a single Fast2SMS WABA WhatsApp template by message ID.
 * @param {string} apiKey
 * @param {number} messageId        - Fast2SMS message_id
 * @param {string} phoneNumberId    - WABA phone_number_id
 * @param {string} phoneNumber      - recipient phone (any Indian format)
 * @param {string[]} variables
 */
async function testWhatsAppTemplate(apiKey, messageId, phoneNumberId, phoneNumber, variables = []) {
    try {
        if (!apiKey) throw new Error('FAST2SMS_API_KEY is required');

        const cleanNumber = String(phoneNumber).replace(/\D/g, '').slice(-10);

        const params = new URLSearchParams({
            authorization: apiKey,
            message_id: String(messageId),
            phone_number_id: String(phoneNumberId),
            numbers: cleanNumber,
        });

        if (variables.length > 0) {
            params.append('variables_values', variables.map(String).join('|'));
        }

        const url = `${WHATSAPP_URL}?${params.toString()}`;

        console.log(`\n🧪 Testing msgId=${messageId} via pnId=${phoneNumberId}`);
        console.log(`📱 Phone: +91${cleanNumber}`);
        console.log(`📝 Variables: ${variables.length > 0 ? variables.join(' | ') : 'None'}`);

        const response = await axios.get(url, { timeout: 10000 });
        const resData = response.data;

        if (resData.return === true || resData.status === 'sent') {
            console.log('✅ SUCCESS');
            return { success: true, data: resData };
        } else {
            console.log('⚠️  WARNING: unclear response:', JSON.stringify(resData).substring(0, 100));
            return { success: false, data: resData };
        }
    } catch (error) {
        console.log(`❌ ERROR: ${error.message}`);
        return { success: false, error: error.message, data: error.response?.data };
    }
}

/**
 * Test all registered WhatsApp templates with sample data.
 * Skips templates that require media (can't test without a real URL).
 */
async function testAllTemplates(apiKey, testPhoneNumber) {
    // Build test cases from the live registry — always in sync with templates.js
    const tests = Object.entries(WHATSAPP_TEMPLATES)
        .filter(([, tmpl]) => !tmpl.mediaRequired)   // skip media-header templates
        .map(([key, tmpl]) => ({
            key,
            messageId: tmpl.messageId,
            waba: tmpl.waba,
            phoneNumberId: WABA_ACCOUNTS[tmpl.waba]?.phoneNumberId,
            variables: _sampleVars(key, tmpl.variables),
            description: tmpl.description,
        }));

    console.log('\n' + '='.repeat(70));
    console.log('🧪 FAST2SMS WABA WHATSAPP TEST SUITE');
    console.log('='.repeat(70));
    console.log(`Total Tests: ${tests.length} (media templates skipped)`);
    console.log('='.repeat(70) + '\n');

    const results = [];

    for (const test of tests) {
        const result = await testWhatsAppTemplate(
            apiKey,
            test.messageId,
            test.phoneNumberId,
            testPhoneNumber,
            test.variables
        );
        results.push({
            key: test.key,
            id: test.messageId,
            waba: test.waba,
            description: test.description,
            success: result.success,
            error: result.error || null,
        });

        await new Promise(r => setTimeout(r, 600));
    }

    const passed = results.filter(r => r.success).length;
    const failed = results.filter(r => !r.success).length;

    console.log('\n' + '='.repeat(70));
    console.log('📊 TEST SUMMARY');
    console.log('='.repeat(70));
    for (const r of results) {
        console.log(`${r.success ? '✅' : '❌'} [${r.id}] ${r.key} (${r.waba})`);
        if (!r.success && r.error) console.log(`   Error: ${r.error}`);
    }
    console.log('='.repeat(70));
    console.log(`✅ Passed: ${passed}/${tests.length}  ❌ Failed: ${failed}/${tests.length}`);
    console.log('='.repeat(70) + '\n');

    return { total: tests.length, passed, failed, results };
}

/** Generate plausible sample variable values for each template key */
function _sampleVars(key, count) {
    const MAP = {
        OTP_USER:                   ['123456'],
        FAMILY_OTP:                 ['123456'],
        EMP_OTP:                    ['123456'],
        BOOKING_CONFIRMED:          ['Rajesh Kumar', 'BK-2026-001'],
        PAYMENT_RECEIVED:           ['Priya Sharma', '2999'],
        ORDER_CANCELLED:            ['Arjun Mehta', 'BK-2026-002'],
        PRESCRIPTION_RECEIVED:      ['Sunita Devi'],
        LAB_REPORT_READY:           ['Ravi Patel'],
        PLAN_EXPIRY_REMINDER:       ['Kavitha Nair'],
        SOS_ALERT_CLIENT:           ['Mohan Singh', 'Ph: 9876543210 | Bengaluru | https://maps.google.com | 10:30 AM'],
        SOS_ALERT_FAMILY:           [],
        PLAN_EXPIRED_FAMILY:        ['Anita Rao', 'Mohan Singh', 'AYX-2026-0001'],
        PLAN_EXPIRY_FAMILY:         ['Anita Rao', 'AYX-2026-0001'],
        HEALTH_CHECK_FAMILY:        ['Mohan Singh'],
        WELCOME_USER:               [],
        WELLNESS_REMINDER:          ['Deepa Krishnan'],
        BIRTHDAY_WISHES:            ['BDAY30'],
        SHIFT_ASSIGNED:             ['Nurse Latha', 'Mohan Singh', 'AYX-2026-0001', '25 May 2026', '09:00 AM'],
        SOS_DISPATCH:               ['Nurse Latha', 'Mohan Singh', 'AYX-2026-0001'],
        SHIFT_CANCELLED:            ['Nurse Latha', 'Mohan Singh', 'BK-2026-003', '25 May 2026'],
        SOS_ALERT_OPS:              ['Mohan Singh', 'Ph: 9876543210 | Bengaluru | https://maps.google.com | 10:30 AM'],
    };

    const vars = MAP[key];
    if (vars !== undefined) return vars;

    // Fallback: generate generic placeholders
    return Array.from({ length: count }, (_, i) => `var${i + 1}`);
}

/**
 * Quick diagnostic — verifies API key is valid and reachable.
 */
async function diagnoseWhatsApp(apiKey) {
    console.log('\n🔍 DIAGNOSING FAST2SMS WABA CONNECTION...\n');

    if (!apiKey || apiKey.length < 20) {
        console.log('❌ Invalid API key format');
        return false;
    }
    console.log('✅ API key format valid');

    // Ping with OTP_USER template (AYUXA account) — a safe, always-registered template
    try {
        const { messageId } = WHATSAPP_TEMPLATES.OTP_USER;
        const { phoneNumberId } = WABA_ACCOUNTS.AYUXA;
        const testUrl = `${WHATSAPP_URL}?authorization=${apiKey}&message_id=${messageId}&phone_number_id=${phoneNumberId}&numbers=9999999999`;
        const response = await axios.get(testUrl, { timeout: 5000 });
        const resData = response.data;

        if (resData.return === true || resData.status === 'sent' || resData.message) {
            console.log('✅ API key is valid and accessible');
        } else if (resData.error || JSON.stringify(resData).includes('invalid')) {
            console.log('⚠️  API key may be invalid:', JSON.stringify(resData).substring(0, 100));
            return false;
        } else {
            console.log('✅ Connection established:', JSON.stringify(resData).substring(0, 100));
        }
    } catch (err) {
        console.log('❌ Cannot connect to Fast2SMS API:', err.message);
        return false;
    }

    console.log('✅ Diagnostics passed!\n');
    return true;
}

module.exports = {
    testWhatsAppTemplate,
    testAllTemplates,
    diagnoseWhatsApp,
};
