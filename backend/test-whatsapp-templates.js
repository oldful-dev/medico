#!/usr/bin/env node
// ──────────────────────────────────────────────
//  Fast2SMS WABA WhatsApp Template Test Script
//  Usage: node test-whatsapp-templates.js [phone_number] [api_key]
// ──────────────────────────────────────────────

const { testAllTemplates, diagnoseWhatsApp, testWhatsAppTemplate } = require('./src/utils/test-whatsapp');

const args = process.argv.slice(2);
const testPhone = args[0] || process.env.TEST_PHONE || '9999999999';
const apiKey = args[1] || process.env.FAST2SMS_API_KEY;

if (!apiKey) {
    console.error('\n❌ Error: FAST2SMS_API_KEY not provided');
    console.error('\nUsage:');
    console.error('  node test-whatsapp-templates.js [phone_number] [api_key]');
    console.error('\nExamples:');
    console.error('  node test-whatsapp-templates.js 9876543210 LIDHkiz9...');
    console.error('  FAST2SMS_API_KEY=your-key node test-whatsapp-templates.js 9876543210');
    console.error('\nOr set in .env:');
    console.error('  FAST2SMS_API_KEY=LIDHkiz9...');
    process.exit(1);
}

(async () => {
    try {
        // Run diagnostics first
        const isValid = await diagnoseWhatsApp(apiKey);

        if (!isValid) {
            console.error('\n⚠️  Diagnostics failed. Check your API key and connection.');
            process.exit(1);
        }

        // Run all tests
        const results = await testAllTemplates(apiKey, testPhone);

        // Exit with appropriate code
        process.exit(results.failed > 0 ? 1 : 0);

    } catch (error) {
        console.error('\n❌ Unexpected error:', error.message);
        process.exit(1);
    }
})();
