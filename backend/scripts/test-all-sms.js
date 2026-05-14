#!/usr/bin/env node
/**
 * Test all DLT SMS templates
 *
 * Usage:
 *   node test-all-sms.js <phoneNumber>
 *   node test-all-sms.js 9876543210
 */

require('dotenv').config();
const { sendDLTSMS } = require('../src/utils/fast2sms');

const TEMPLATES = {
    OTP: {
        id: '215237',
        name: 'OTP Verification',
        variables: ['123456'],
        example: '123456 is your Ayuxa code. For your security, do not share this code with anyone, AYUXA never ask for your OTP, bank, or card details. Team Ayuxa.'
    },
    ORDER: {
        id: '215239',
        name: 'Order/Booking Confirmation',
        variables: ['John Doe', 'MED-BLR-00020', '9480198108'],
        example: 'Dear John Doe, your order MED-BLR-00020 is confirmed. For support contact 9480198108 Team Ayuxa.'
    },
    SOS: {
        id: '215240',
        name: 'SOS Emergency Alert',
        variables: ['Dr. Smith', 'John Doe'],
        example: 'Dear Dr. Smith, SOS triggered by John Doe in Ayuxa Mobile Application. Please take immediate action. Team Ayuxa.'
    },
    PAYMENT: {
        id: '215352',
        name: 'Payment Confirmation',
        variables: ['John Doe', '5000'], // Template adds ₹
        example: 'Dear John Doe, We\'ve received your ₹5000 payment. Receipt is now available in the app and on our website. Team Ayuxa.'
    }
};

async function testAllSMS() {
    const phoneNumber = process.argv[2];

    if (!phoneNumber) {
        console.error('❌ Usage: node test-all-sms.js <phoneNumber>');
        console.error('Example: node test-all-sms.js 9876543210');
        process.exit(1);
    }

    console.log('\n========================================');
    console.log('  DLT SMS Templates Test');
    console.log('========================================\n');

    // Check configuration
    console.log('📋 Configuration Check:');
    console.log(`   API Key: ${process.env.FAST2SMS_API_KEY ? '✅ Set' : '❌ Missing'}`);
    console.log(`   Sender ID: ${process.env.FAST2SMS_SENDER_ID || '❌ Missing'} (default: AYUXA)`);
    console.log(`   Entity ID: ${process.env.FAST2SMS_ENTITY_ID || '❌ Missing'}`);

    console.log('\n📱 Testing Phone: ' + phoneNumber);
    console.log('\n========================================\n');

    if (!process.env.FAST2SMS_API_KEY) {
        console.error('❌ Error: FAST2SMS_API_KEY not set in .env');
        process.exit(1);
    }

    const results = {};
    let successCount = 0;
    let failureCount = 0;

    // Test each template
    for (const [key, template] of Object.entries(TEMPLATES)) {
        const envKey = `FAST2SMS_${key}_TEMPLATE_ID`;
        const templateId = process.env[envKey];

        if (!templateId) {
            console.log(`⏭️  ${key} (${template.name})`);
            console.log(`   Template ID env var not set: ${envKey}`);
            console.log(`   ⚠️  Skipping...\n`);
            continue;
        }

        if (templateId !== template.id) {
            console.log(`⚠️  ${key} (${template.name})`);
            console.log(`   Expected ID: ${template.id}, but found: ${templateId}`);
            console.log(`   ⚠️  Proceeding with configured ID...\n`);
        }

        console.log(`🧪 Testing ${key} (${template.name})`);
        console.log(`   Template ID: ${templateId}`);
        console.log(`   Variables: ${JSON.stringify(template.variables)}`);
        console.log(`   Example: "${template.example}"`);
        console.log(`   Sending...`);

        try {
            const result = await sendDLTSMS(phoneNumber, templateId, template.variables);

            if (result) {
                console.log(`   ✅ SUCCESS\n`);
                results[key] = 'success';
                successCount++;
            } else {
                console.log(`   ❌ FAILED\n`);
                results[key] = 'failed';
                failureCount++;
            }
        } catch (error) {
            console.log(`   ❌ ERROR: ${error.message}\n`);
            results[key] = 'error';
            failureCount++;
        }

        // Small delay between requests
        await new Promise(resolve => setTimeout(resolve, 500));
    }

    // Summary
    console.log('========================================');
    console.log('  Test Summary');
    console.log('========================================\n');

    console.log('Results:');
    for (const [key, status] of Object.entries(results)) {
        const icon = status === 'success' ? '✅' : '❌';
        console.log(`   ${icon} ${key}: ${status.toUpperCase()}`);
    }

    console.log(`\n   Total: ${successCount} passed, ${failureCount} failed\n`);

    if (failureCount > 0) {
        process.exit(1);
    }

    console.log('========================================\n');
}

testAllSMS();
