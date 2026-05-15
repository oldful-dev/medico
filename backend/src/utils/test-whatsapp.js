// ──────────────────────────────────────────────
//  Fast2SMS WABA WhatsApp Test Utility
//  Use this to test WhatsApp templates without triggering business logic
// ──────────────────────────────────────────────

const axios = require('axios');
const { logger } = require('../config/logger');

const WHATSAPP_URL = 'https://www.fast2sms.com/dev/whatsapp';

/**
 * Test a single Fast2SMS WABA WhatsApp template
 * @param {string} apiKey - Fast2SMS API key
 * @param {number} templateId - WABA template ID (20510-20525)
 * @param {string} phoneNumber - 10-digit phone number
 * @param {string[]} variables - Variable values for template
 * @returns {Promise<object>} Response from Fast2SMS
 */
async function testWhatsAppTemplate(apiKey, templateId, phoneNumber, variables = []) {
    try {
        if (!apiKey) {
            throw new Error('FAST2SMS_API_KEY is required');
        }

        const cleanNumber = phoneNumber.replace(/\D/g, '').slice(-10);

        const params = new URLSearchParams({
            authorization: apiKey,
            message_id: String(templateId),
            phone_number_id: '1137788802753379',
            numbers: cleanNumber,
        });

        if (variables.length > 0) {
            params.append('variables_values', variables.map(String).join('|'));
        }

        const url = `${WHATSAPP_URL}?${params.toString()}`;

        console.log(`\n🧪 Testing WhatsApp Template ID: ${templateId}`);
        console.log(`📱 Phone: +91${cleanNumber}`);
        console.log(`📝 Variables: ${variables.length > 0 ? variables.join(', ') : 'None'}`);
        console.log(`🔗 URL (hidden): ${WHATSAPP_URL}?...`);

        const response = await axios.get(url, { timeout: 10000 });
        const resData = response.data;

        if (resData.return === true || resData.status === 'sent') {
            console.log(`✅ SUCCESS: Message accepted by Fast2SMS`);
            console.log(`   Response:`, JSON.stringify(resData, null, 2));
            return { success: true, data: resData };
        } else {
            console.log(`⚠️  WARNING: Fast2SMS response unclear`);
            console.log(`   Response:`, JSON.stringify(resData, null, 2));
            return { success: false, data: resData };
        }

    } catch (error) {
        const errStatus = error.response?.status;
        const errData = error.response?.data;
        console.log(`❌ ERROR: Failed to send WhatsApp template`);
        console.log(`   Status: ${errStatus || 'Network error'}`);
        console.log(`   Message: ${error.message}`);
        if (errData) {
            console.log(`   Response:`, JSON.stringify(errData, null, 2));
        }
        return { success: false, error: error.message, data: errData };
    }
}

/**
 * Test all 12 WhatsApp templates with sample data
 */
async function testAllTemplates(apiKey, testPhoneNumber) {
    const tests = [
        {
            id: 20515,
            name: 'Verification Code',
            variables: ['123456', '+91 9999999999'],
            description: 'OTP verification (expires in 5 minutes)',
        },
        {
            id: 20510,
            name: 'Ayuxa Remember',
            variables: ['John Doe'],
            description: 'Wellness reminder',
        },
        {
            id: 20511,
            name: 'Birthday Wishes',
            variables: ['Jane Smith'],
            description: 'Birthday greeting (can include image)',
        },
        {
            id: 20512,
            name: 'Lab Test',
            variables: ['Dr. Patient'],
            description: 'Lab report ready notification',
        },
        {
            id: 20513,
            name: 'Urgent Alert (SOS)',
            variables: ['John Doe', 'AYX-2026-0001'],
            description: 'Emergency SOS alert',
        },
        {
            id: 20514,
            name: 'Welcome Flow',
            variables: [],
            description: 'New user welcome (no body variables)',
        },
        {
            id: 20519,
            name: 'Order Status',
            variables: ['Customer Name', 'ORD-2026-05-14-001'],
            description: 'Order/booking status update',
        },
        {
            id: 20520,
            name: 'Payment Successful',
            variables: ['Rajesh Kumar', '5000'],
            description: 'Payment confirmation',
        },
        {
            id: 20521,
            name: 'Booking Confirmation',
            variables: ['Priya Sharma', 'BK-2026-05-14-999'],
            description: 'Service booking confirmed',
        },
        {
            id: 20522,
            name: 'Prescription Received',
            variables: ['Patient Name'],
            description: 'Doctor prescription upload confirmation',
        },
        {
            id: 20523,
            name: 'Plan Expiry Reminder',
            variables: ['User Name'],
            description: 'Subscription plan expiry warning',
        },
        {
            id: 20525,
            name: 'Feedback',
            variables: ['Feedback Recipient'],
            description: 'Post-service feedback survey',
        },
    ];

    console.log('\n' + '='.repeat(70));
    console.log('🧪 FAST2SMS WABA WHATSAPP TEST SUITE');
    console.log('='.repeat(70));
    console.log(`API Key: ${apiKey.substring(0, 20)}...`);
    console.log(`Test Phone: +91${testPhoneNumber.replace(/\D/g, '').slice(-10)}`);
    console.log(`Total Tests: ${tests.length}`);
    console.log('='.repeat(70) + '\n');

    const results = [];

    for (const test of tests) {
        const result = await testWhatsAppTemplate(apiKey, test.id, testPhoneNumber, test.variables);
        results.push({
            id: test.id,
            name: test.name,
            description: test.description,
            success: result.success,
            error: result.error || null,
        });

        // Small delay between requests to avoid rate limiting
        await new Promise(r => setTimeout(r, 500));
    }

    // Summary
    console.log('\n' + '='.repeat(70));
    console.log('📊 TEST SUMMARY');
    console.log('='.repeat(70));

    const passed = results.filter(r => r.success).length;
    const failed = results.filter(r => !r.success).length;

    for (const result of results) {
        const status = result.success ? '✅' : '❌';
        console.log(`${status} [${result.id}] ${result.name}`);
        if (!result.success && result.error) {
            console.log(`   Error: ${result.error}`);
        }
    }

    console.log('='.repeat(70));
    console.log(`✅ Passed: ${passed}/${tests.length}`);
    console.log(`❌ Failed: ${failed}/${tests.length}`);
    console.log('='.repeat(70) + '\n');

    return {
        total: tests.length,
        passed,
        failed,
        results,
    };
}

/**
 * Quick diagnostic check
 */
async function diagnoseWhatsApp(apiKey) {
    console.log('\n🔍 DIAGNOSING FAST2SMS WABA CONNECTION...\n');

    // 1. Check API key format
    if (!apiKey || apiKey.length < 20) {
        console.log('❌ Invalid API key format');
        return false;
    }
    console.log('✅ API key format valid');

    // 2. Check if key is accessible
    try {
        const testUrl = `${WHATSAPP_URL}?authorization=${apiKey}&message_id=20515&phone_number_id=1137788802753379&numbers=9999999999`;
        const response = await axios.get(testUrl, { timeout: 5000 });
        const resData = response.data;

        if (resData.return === true || resData.status === 'sent' || resData.message) {
            console.log('✅ API key is valid and accessible');
            console.log(`   Response code: ${resData.return === true ? '200' : resData.status}`);
        } else if (resData.error || resData.message?.includes('invalid') || resData.message?.includes('error')) {
            console.log('⚠️  API key may be invalid');
            console.log(`   Response: ${JSON.stringify(resData).substring(0, 100)}`);
            return false;
        } else {
            console.log('✅ Connection established (response unclear but no errors)');
            console.log(`   Response: ${JSON.stringify(resData).substring(0, 100)}`);
        }
    } catch (err) {
        console.log('❌ Cannot connect to Fast2SMS API');
        console.log(`   Error: ${err.message}`);
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
