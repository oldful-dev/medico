#!/usr/bin/env node
/**
 * Test script for payment SMS via Fast2SMS DLT
 *
 * Usage:
 *   node test-payment-sms.js <phoneNumber> <amount> [userName]
 *   node test-payment-sms.js 9876543210 5000 "John Doe"
 *   node test-payment-sms.js 9876543210 1000
 */

require('dotenv').config();
const { sendDLTSMS } = require('../src/utils/fast2sms');

async function testPaymentSMS() {
    const args = process.argv.slice(2);

    if (args.length < 2) {
        console.error('❌ Usage: node test-payment-sms.js <phoneNumber> <amount> [userName]');
        console.error('Example: node test-payment-sms.js 9876543210 5000 "John Doe"');
        process.exit(1);
    }

    const phoneNumber = args[0];
    const amount = args[1];
    const userName = args[2] || 'Customer';

    console.log('\n========================================');
    console.log('  Payment SMS Test');
    console.log('========================================\n');

    console.log('📋 Configuration:');
    console.log(`   API Key: ${process.env.FAST2SMS_API_KEY ? '✅ Set' : '❌ Missing'}`);
    console.log(`   Template ID: ${process.env.FAST2SMS_PAYMENT_TEMPLATE_ID || '❌ Missing'}`);
    console.log(`   Sender ID: ${process.env.FAST2SMS_SENDER_ID || 'AYUXA'}`);
    console.log(`   Entity ID: ${process.env.FAST2SMS_ENTITY_ID || '❌ Missing'}`);

    if (!process.env.FAST2SMS_API_KEY) {
        console.error('\n❌ Error: FAST2SMS_API_KEY not set in .env');
        process.exit(1);
    }

    if (!process.env.FAST2SMS_PAYMENT_TEMPLATE_ID) {
        console.error('\n❌ Error: FAST2SMS_PAYMENT_TEMPLATE_ID not set in .env');
        process.exit(1);
    }

    console.log('\n📱 Test Details:');
    console.log(`   Phone: ${phoneNumber}`);
    console.log(`   Amount: ₹${amount}`);
    console.log(`   User: ${userName}`);
    console.log(`   Template: ${process.env.FAST2SMS_PAYMENT_TEMPLATE_ID}`);

    console.log('\n📤 Sending SMS...\n');

    try {
        const result = await sendDLTSMS(
            phoneNumber,
            process.env.FAST2SMS_PAYMENT_TEMPLATE_ID,
            [userName, amount] // Template adds ₹ symbol
        );

        if (result) {
            console.log('\n✅ SUCCESS: SMS sent successfully!');
            console.log('\n📬 Message preview:');
            console.log(`   Dear ${userName}, We've received your ₹${amount} payment.`);
            console.log(`   Receipt is now available in the app and on our website.`);
            console.log(`   Team Ayuxa.`);
        } else {
            console.log('\n❌ FAILED: SMS was not sent. Check logs above for details.');
            process.exit(1);
        }
    } catch (error) {
        console.error('\n❌ ERROR:', error.message);
        process.exit(1);
    }

    console.log('\n========================================\n');
}

testPaymentSMS();
