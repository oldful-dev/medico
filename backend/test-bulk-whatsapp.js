#!/usr/bin/env node
// ──────────────────────────────────────────────
//  Fast2SMS WABA Bulk WhatsApp Test Script
//  Send all 12 templates to multiple phone numbers
// ──────────────────────────────────────────────

const { testAllTemplates } = require('./src/utils/test-whatsapp');

const apiKey = process.env.FAST2SMS_API_KEY || 'LIDHkiz9CcUnh2xpqA7rlXfNTe41WRyYBgmJa3wto8bMKvE6uZL0CEDFy85ln4YciT6e7BMtXvpmhRx2';

// Phone numbers from user input
const phoneNumbers = [
    '8000494294',
    '7004159314',
    '7247339655',
    '8657381139',
    '8876092360'
];

(async () => {
    try {
        console.log('\n' + '='.repeat(70));
        console.log('📱 BULK WHATSAPP TEST');
        console.log('='.repeat(70));
        console.log(`Total Numbers: ${phoneNumbers.length}`);
        console.log(`Total Templates: 12`);
        console.log(`Total Messages: ${phoneNumbers.length * 12}`);
        console.log('='.repeat(70) + '\n');

        const results = {};
        let totalPassed = 0;
        let totalFailed = 0;

        for (const phone of phoneNumbers) {
            console.log(`\n📞 Testing phone: +91${phone}`);
            console.log('-'.repeat(70));

            const result = await testAllTemplates(apiKey, phone);
            results[phone] = result;

            totalPassed += result.passed;
            totalFailed += result.failed;

            console.log(`✅ ${result.passed}/${result.total} templates passed for +91${phone}\n`);
        }

        // Final summary
        console.log('\n' + '='.repeat(70));
        console.log('📊 BULK TEST SUMMARY');
        console.log('='.repeat(70));
        console.log(`Total Numbers Tested: ${phoneNumbers.length}`);
        console.log(`Total Messages Sent: ${totalPassed}`);
        console.log(`Total Failed: ${totalFailed}`);
        console.log(`Overall Success Rate: ${((totalPassed / (totalPassed + totalFailed)) * 100).toFixed(1)}%`);
        console.log('='.repeat(70) + '\n');

        // Per-number breakdown
        console.log('📱 PER-NUMBER BREAKDOWN:');
        for (const phone of phoneNumbers) {
            const result = results[phone];
            const status = result.failed === 0 ? '✅' : '⚠️';
            console.log(`${status} +91${phone}: ${result.passed}/${result.total} passed`);
        }
        console.log('='.repeat(70) + '\n');

        process.exit(totalFailed > 0 ? 1 : 0);

    } catch (error) {
        console.error('\n❌ Unexpected error:', error.message);
        process.exit(1);
    }
})();
