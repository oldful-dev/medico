// ──────────────────────────────────────────────
//  Manual verification: deletion → scheduled communication → nothing sent.
//
//  Creates a throwaway user + active subscription + emergency contact,
//  soft-deletes the user (same fields as the real delete-account controller),
//  then checks:
//    1. The cron recipient queries (now filtered by user.status: 'ACTIVE')
//       no longer return this subscription/contact.
//    2. Each of the four send wrappers refuses to send to this userId and
//       records why in NotificationLog.
//
//  Run manually: node scripts/test-deleted-user-no-comms.js
//  Cleans up all rows it creates, including on failure.
// ──────────────────────────────────────────────

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const { canSendTo } = require('../src/utils/communicationGate');
const { sendSMS } = require('../src/services/sms');
const { sendEmail } = require('../src/services/email');
const { sendPushToUser } = require('../src/utils/pushNotification.service');

const assert = (cond, msg) => {
    if (!cond) throw new Error(`ASSERTION FAILED: ${msg}`);
    console.log(`  ✅ ${msg}`);
};

async function run() {
    const suffix = Date.now();
    let city, plan, user, subscription, contact;

    try {
        // ── Setup ──────────────────────────────────────────────
        city = await prisma.city.findFirst();
        if (!city) throw new Error('No City rows exist — seed at least one City before running this script.');

        plan = await prisma.plan.findFirst();
        if (!plan) throw new Error('No Plan rows exist — seed at least one Plan before running this script.');

        user = await prisma.user.create({
            data: {
                uniqueUserId: `TEST-DEL-${suffix}`,
                name: 'Test Deletion User',
                phone: `9${String(suffix).slice(-9)}`,
                email: `test-del-${suffix}@example.invalid`,
                cityId: city.id,
                status: 'ACTIVE',
                whatsappEnabled: true,
                smsEnabled: true,
                emailMarketingEnabled: true,
                pushEnabled: true,
                fcmDeviceToken: 'test-fake-token',
            },
        });

        subscription = await prisma.subscription.create({
            data: {
                userId: user.id,
                planId: plan.id,
                billingCycle: 'YEARLY',
                startDate: new Date(),
                expiryDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000), // 3 days out — matches cron job 1's 3-day window
                amount: 100,
                status: 'ACTIVE',
                autoRenew: true,
            },
        });

        contact = await prisma.emergencyContact.create({
            data: {
                userId: user.id,
                name: 'Test Emergency Contact',
                phone: `8${String(suffix).slice(-9)}`,
                relationship: 'Sibling',
            },
        });

        console.log(`\nCreated test user ${user.id} with active subscription + emergency contact.\n`);

        // ── Sanity: while ACTIVE, everything should be eligible ──
        console.log('Before deletion:');
        const gateBefore = await canSendTo(user.id);
        assert(gateBefore.allowed === true, 'canSendTo() allows an ACTIVE user');

        const subsBefore = await prisma.subscription.findMany({
            where: { id: subscription.id, user: { status: 'ACTIVE' } },
        });
        assert(subsBefore.length === 1, 'cron-style subscription query returns the row while user is ACTIVE');

        // ── Soft-delete the user (mirrors deleteProfile in user.controller.js) ──
        await prisma.user.update({
            where: { id: user.id },
            data: {
                name: 'Deleted User',
                phone: `deleted_${user.id}_${user.phone}`,
                email: `deleted_${user.id}_${user.email}`,
                fcmDeviceToken: null,
                refreshToken: null,
                status: 'DELETED',
                deletedAt: new Date(),
            },
        });
        console.log('\nUser soft-deleted.\n');

        // ── 1. Cron recipient queries must now exclude this subscription/contact ──
        console.log('After deletion — cron-style queries:');
        const subsAfter = await prisma.subscription.findMany({
            where: { id: subscription.id, user: { status: 'ACTIVE' } },
        });
        assert(subsAfter.length === 0, 'subscription query (with user: {status: ACTIVE} filter) no longer returns the deleted user\'s subscription');

        const contactsAfter = await prisma.emergencyContact.findMany({
            where: { userId: user.id, user: { status: 'ACTIVE' } },
        });
        assert(contactsAfter.length === 0, 'emergencyContact query (with user: {status: ACTIVE} filter) no longer returns the deleted user\'s contact');

        // ── 2. Each send wrapper must refuse and log why ──────────
        console.log('\nAfter deletion — send wrappers:');

        const gateAfter = await canSendTo(user.id);
        assert(gateAfter.allowed === false, 'canSendTo() refuses a DELETED user');
        assert(gateAfter.reason === 'Recipient user is deleted', `reason is descriptive (got: "${gateAfter.reason}")`);

        const smsResult = await sendSMS({ template: 'WELLNESS_CHECKIN', mobile: '9876543210', variables: ['Test'], userId: user.id });
        assert(smsResult === false, 'sendSMS() returns false for a deleted user');

        const emailResult = await sendEmail({ to: 'test-del@example.invalid', subject: 'Test', html: '<p>Test</p>', userId: user.id });
        assert(emailResult === false, 'sendEmail() returns false for a deleted user');

        const pushResult = await sendPushToUser(user.id, { title: 'Test', body: 'Test' });
        assert(pushResult === false, 'sendPushToUser() returns false for a deleted user');

        // ── 3. NotificationLog rows recorded the suppression reason ──
        const logs = await prisma.notificationLog.findMany({
            where: { recipientId: user.id, isSent: false },
            orderBy: { createdAt: 'desc' },
            take: 5,
        });
        assert(logs.length > 0, 'NotificationLog has suppressed-send rows for this user');
        assert(
            logs.every(l => /deleted/i.test(l.errorMessage || '')),
            `all recent suppressed logs cite the deletion as the reason (got: ${logs.map(l => l.errorMessage).join(' | ')})`
        );

        console.log('\n✅ ALL CHECKS PASSED — deleted users receive no communication.\n');
    } finally {
        // ── Cleanup ────────────────────────────────────────────
        if (user) {
            await prisma.notificationLog.deleteMany({ where: { recipientId: user.id } }).catch(() => {});
            await prisma.emergencyContact.deleteMany({ where: { userId: user.id } }).catch(() => {});
            await prisma.subscription.deleteMany({ where: { userId: user.id } }).catch(() => {});
            await prisma.user.delete({ where: { id: user.id } }).catch(() => {});
            console.log('Test rows cleaned up.');
        }
        await prisma.$disconnect();
    }
}

// Only run when executed directly (`node scripts/test-deleted-user-no-comms.js`),
// never as a side effect of require() — e.g. a syntax-check load.
if (require.main === module) {
    run().catch(err => {
        console.error('\n❌', err.message);
        process.exitCode = 1;
    });
}
