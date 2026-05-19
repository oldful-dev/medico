#!/usr/bin/env node
// ──────────────────────────────────────────────
//  Run: node backend/scripts/test-all-whatsapp.js
//  Tests all 13 WhatsApp templates via the real
//  service layer (validates fixes too).
// ──────────────────────────────────────────────

require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });

const wa = require('../src/services/whatsapp');

const PHONE = '7362973003';
const NAME  = 'ADARSH';
const ID    = 'AYX-TEST-001';

const TESTS = [
    {
        key: 'OTP_USER',
        label: 'OTP / Verification Code',
        run: () => wa.sendOTP({ phone: PHONE, code: '482916', supportContact: '+91 94801 98108' }),
    },
    {
        key: 'BOOKING_CONFIRMED',
        label: 'Booking Confirmation',
        run: () => wa.sendBookingConfirmed({ phone: PHONE, name: NAME, bookingId: 'LAB-TEST-001' }),
    },
    {
        key: 'PAYMENT_RECEIVED',
        label: 'Payment Received',
        run: () => wa.sendPaymentReceived({ phone: PHONE, name: NAME, amount: '1999' }),
    },
    {
        key: 'ORDER_CANCELLED',
        label: 'Order Cancelled',
        run: () => wa.sendOrderCancelled({ phone: PHONE, name: NAME, orderId: 'LAB-TEST-001' }),
    },
    {
        key: 'PRESCRIPTION_RECEIVED',
        label: 'Prescription Received',
        run: () => wa.sendPrescriptionReceived({ phone: PHONE, name: NAME }),
    },
    {
        key: 'LAB_REPORT_READY',
        label: 'Lab Report Ready',
        run: () => wa.sendLabReportReady({ phone: PHONE, name: NAME }),
    },
    {
        key: 'PLAN_EXPIRY_REMINDER',
        label: 'Plan Expiry Reminder',
        run: () => wa.sendPlanExpiryReminder({ phone: PHONE, name: NAME }),
    },
    {
        key: 'PLAN_EXPIRY_FAMILY (admin)',
        label: 'Plan Expiry Admin Alert',
        run: () => wa.sendPlanExpiryAdmin({ phone: PHONE, name: NAME }),
    },
    {
        key: 'WELLNESS_REMINDER',
        label: 'Wellness Reminder',
        run: () => wa.sendWellnessReminder({ phone: PHONE, name: NAME }),
    },
    {
        key: 'BIRTHDAY_WISHES',
        label: 'Birthday Wishes',
        // mediaUrl required — use a public Ayuxa asset or placeholder
        run: () => wa.sendBirthdayWishes({ phone: PHONE, couponCode: 'BDAY20', mediaUrl: 'https://storage.googleapis.com/ayuxa-assets/branding/birthday-card.jpg' }),
    },
    {
        key: 'SOS_ALERT',
        label: 'SOS Alert (Family)',
        run: () => wa.sendSOSAlert({ phone: PHONE, userName: NAME, ayuxaId: ID }),
    },
    {
        key: 'SOS_ALERT_ADMIN',
        label: 'SOS Alert (Admin/Console)',
        run: () => wa.sendSOSAlertAdmin({ phone: PHONE, userName: NAME, ayuxaId: ID }),
    },
];

const GREEN  = '\x1b[32m';
const RED    = '\x1b[31m';
const YELLOW = '\x1b[33m';
const RESET  = '\x1b[0m';
const BOLD   = '\x1b[1m';

async function run() {
    console.log(`\n${BOLD}${'='.repeat(65)}${RESET}`);
    console.log(`${BOLD}  AYUXA WHATSAPP TEMPLATE TEST SUITE${RESET}`);
    console.log(`${BOLD}${'='.repeat(65)}${RESET}`);
    console.log(`  Phone   : +91${PHONE}`);
    console.log(`  API Key : ${(process.env.FAST2SMS_API_KEY || '').slice(0, 20)}...`);
    console.log(`  Tests   : ${TESTS.length}`);
    console.log(`${'='.repeat(65)}\n`);

    const results = [];

    for (const test of TESTS) {
        process.stdout.write(`  [${test.key}] ${test.label} ... `);
        try {
            const ok = await test.run();
            if (ok) {
                process.stdout.write(`${GREEN}SENT${RESET}\n`);
                results.push({ ...test, status: 'SENT' });
            } else {
                process.stdout.write(`${YELLOW}SKIPPED/REJECTED${RESET}\n`);
                results.push({ ...test, status: 'SKIPPED' });
            }
        } catch (err) {
            process.stdout.write(`${RED}ERROR: ${err.message}${RESET}\n`);
            results.push({ ...test, status: 'ERROR', error: err.message });
        }
        // 600ms gap to stay under rate limit
        await new Promise(r => setTimeout(r, 600));
    }

    const sent    = results.filter(r => r.status === 'SENT').length;
    const skipped = results.filter(r => r.status === 'SKIPPED').length;
    const errors  = results.filter(r => r.status === 'ERROR').length;

    console.log(`\n${'='.repeat(65)}`);
    console.log(`${BOLD}  RESULTS${RESET}`);
    console.log(`${'='.repeat(65)}`);
    for (const r of results) {
        const icon = r.status === 'SENT' ? `${GREEN}✓${RESET}` : r.status === 'ERROR' ? `${RED}✗${RESET}` : `${YELLOW}~${RESET}`;
        console.log(`  ${icon} ${r.label}${r.error ? `  → ${RED}${r.error}${RESET}` : ''}`);
    }
    console.log(`${'='.repeat(65)}`);
    console.log(`  ${GREEN}Sent:${RESET} ${sent}  ${YELLOW}Skipped:${RESET} ${skipped}  ${RED}Errors:${RESET} ${errors}`);
    console.log(`${'='.repeat(65)}\n`);

    process.exit(errors > 0 ? 1 : 0);
}

run().catch(err => {
    console.error('Fatal:', err);
    process.exit(1);
});
