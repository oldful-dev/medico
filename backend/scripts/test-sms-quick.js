#!/usr/bin/env node
require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });

const { sendSMS } = require('../src/services/sms');

const PHONE = process.argv[2] || '7362973003';

const TESTS = [
    { template: 'OTP_USER',          variables: ['482916'] },
    { template: 'ORDER_CONFIRMED',   variables: ['Vishal', 'LAB-TEST-001', '9480198108'] },
    { template: 'PAYMENT_RECEIVED',  variables: ['Vishal', '1999'] },
    { template: 'BUDDY_ASSIGNED',    variables: ['Vishal'] },
    { template: 'LAB_REPORT_READY',  variables: ['Vishal'] },
    { template: 'WELCOME_USER',      variables: ['Vishal'] },
    { template: 'PLAN_EXPIRED_USER', variables: ['Vishal', '9480198108'] },
    { template: 'ORDER_CANCELLED_USER', variables: ['Vishal', 'LAB-TEST-001'] },
    { template: 'SOS_FAMILY',        variables: ['Adarsh', 'Vishal'] },
    { template: 'SOS_ADMIN',         variables: ['Vishal', 'AYX-TEST-001'] },
    { template: 'SOS_PARTNER',       variables: ['AYX-TEST-001'] },
    { template: 'ADMIN_LOGIN_OTP',   variables: ['482916'] },
];

const G = '\x1b[32m', R = '\x1b[31m', Y = '\x1b[33m', B = '\x1b[1m', X = '\x1b[0m';

async function run() {
    console.log(`\n${B}${'='.repeat(60)}${X}`);
    console.log(`${B}  AYUXA DLT SMS TEST SUITE${X}`);
    console.log(`${B}${'='.repeat(60)}${X}`);
    console.log(`  Phone  : +91${PHONE}`);
    console.log(`  Key    : ${(process.env.FAST2SMS_API_KEY || '').slice(0, 20)}...`);
    console.log(`${'='.repeat(60)}\n`);

    const results = [];
    for (const t of TESTS) {
        process.stdout.write(`  [${t.template}] ... `);
        try {
            const ok = await sendSMS({ template: t.template, mobile: PHONE, variables: t.variables });
            process.stdout.write(ok ? `${G}SENT${X}\n` : `${Y}REJECTED${X}\n`);
            results.push({ ...t, status: ok ? 'SENT' : 'REJECTED' });
        } catch (err) {
            process.stdout.write(`${R}ERROR: ${err.message}${X}\n`);
            results.push({ ...t, status: 'ERROR', error: err.message });
        }
        await new Promise(r => setTimeout(r, 500));
    }

    const sent = results.filter(r => r.status === 'SENT').length;
    const fail = results.filter(r => r.status !== 'SENT').length;
    console.log(`\n${'='.repeat(60)}`);
    console.log(`  ${G}Sent: ${sent}${X}  ${R}Failed: ${fail}${X} / ${results.length} total`);
    console.log(`${'='.repeat(60)}\n`);
    process.exit(fail > 0 ? 1 : 0);
}

run().catch(e => { console.error('Fatal:', e); process.exit(1); });
