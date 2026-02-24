// ──────────────────────────────────────────────
//  Background Cron Jobs (node-cron)
// ──────────────────────────────────────────────

const cron = require('node-cron');
const prisma = require('./config/database');
const { logger } = require('./config/logger');
const { sendExpiryReminder } = require('./utils/notifications');
const { calculateExpiryDate } = require('./utils/helpers');

const initCronJobs = () => {
    // ─── 1. Plan Expiry Reminder (Daily at 9 AM) ─────────
    // Sends reminders 7 days and 3 days before expiry
    cron.schedule('0 9 * * *', async () => {
        logger.info('⏰ CRON: Running plan expiry reminder...');
        try {
            const now = new Date();
            const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
            const threeDaysFromNow = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);

            // 7-day reminders
            const expiringSoon7 = await prisma.subscription.findMany({
                where: {
                    status: 'ACTIVE',
                    expiryDate: {
                        gte: new Date(sevenDaysFromNow.toDateString()),
                        lt: new Date(new Date(sevenDaysFromNow.getTime() + 24 * 60 * 60 * 1000).toDateString()),
                    },
                },
                include: { user: true, plan: true },
            });

            for (const sub of expiringSoon7) {
                await sendExpiryReminder({
                    user: sub.user,
                    plan: sub.plan,
                    daysLeft: 7,
                    expiryDate: sub.expiryDate,
                });
            }

            // 3-day reminders
            const expiringSoon3 = await prisma.subscription.findMany({
                where: {
                    status: 'ACTIVE',
                    expiryDate: {
                        gte: new Date(threeDaysFromNow.toDateString()),
                        lt: new Date(new Date(threeDaysFromNow.getTime() + 24 * 60 * 60 * 1000).toDateString()),
                    },
                },
                include: { user: true, plan: true },
            });

            for (const sub of expiringSoon3) {
                await sendExpiryReminder({
                    user: sub.user,
                    plan: sub.plan,
                    daysLeft: 3,
                    expiryDate: sub.expiryDate,
                });
            }

            // Update status of expiring subscriptions
            await prisma.subscription.updateMany({
                where: {
                    status: 'ACTIVE',
                    expiryDate: {
                        gte: new Date(now.toDateString()),
                        lt: new Date(sevenDaysFromNow.toDateString()),
                    },
                },
                data: { status: 'EXPIRING' },
            });

            logger.info(`⏰ CRON: Sent ${expiringSoon7.length + expiringSoon3.length} expiry reminders`);
        } catch (error) {
            logger.error('CRON expiry reminder error:', error);
        }
    });

    // ─── 2. Subscription Auto-Renew (Daily at 1 AM) ──────
    cron.schedule('0 1 * * *', async () => {
        logger.info('⏰ CRON: Running subscription auto-renew...');
        try {
            const expired = await prisma.subscription.findMany({
                where: {
                    status: { in: ['ACTIVE', 'EXPIRING'] },
                    autoRenew: true,
                    expiryDate: { lt: new Date() },
                },
                include: { plan: true, user: true },
            });

            for (const sub of expired) {
                const newStart = new Date(sub.expiryDate);
                const newExpiry = calculateExpiryDate(newStart, sub.billingCycle);

                // Get the price based on billing cycle
                let amount = 0;
                switch (sub.billingCycle) {
                    case 'QUARTERLY': amount = sub.plan.quarterlyPrice; break;
                    case 'BIANNUAL': amount = sub.plan.biannualPrice; break;
                    case 'YEARLY': amount = sub.plan.yearlyPrice; break;
                }

                // Create new subscription
                await prisma.subscription.create({
                    data: {
                        userId: sub.userId,
                        planId: sub.planId,
                        billingCycle: sub.billingCycle,
                        startDate: newStart,
                        expiryDate: newExpiry,
                        amount,
                        autoRenew: true,
                    },
                });

                // Mark old as expired
                await prisma.subscription.update({
                    where: { id: sub.id },
                    data: { status: 'EXPIRED' },
                });
            }

            logger.info(`⏰ CRON: Auto-renewed ${expired.length} subscriptions`);
        } catch (error) {
            logger.error('CRON auto-renew error:', error);
        }
    });

    // ─── 3. SLA Breach Checker (Every 30 minutes) ────────
    cron.schedule('*/30 * * * *', async () => {
        logger.info('⏰ CRON: Running SLA breach checker...');
        try {
            const breached = await prisma.booking.updateMany({
                where: {
                    status: { in: ['PENDING', 'ASSIGNED'] },
                    isSLABreached: false,
                    slaDeadline: { lt: new Date() },
                },
                data: {
                    isSLABreached: true,
                    status: 'SLA_BREACH',
                },
            });

            if (breached.count > 0) {
                logger.warn(`⏰ CRON: ${breached.count} bookings marked as SLA BREACH`);
            }
        } catch (error) {
            logger.error('CRON SLA breach error:', error);
        }
    });

    // ─── 4. Expired Subscriptions Cleanup (Daily at 2 AM)──
    cron.schedule('0 2 * * *', async () => {
        logger.info('⏰ CRON: Running expired subscriptions cleanup...');
        try {
            const result = await prisma.subscription.updateMany({
                where: {
                    status: { in: ['ACTIVE', 'EXPIRING'] },
                    autoRenew: false,
                    expiryDate: { lt: new Date() },
                },
                data: { status: 'EXPIRED' },
            });

            logger.info(`⏰ CRON: ${result.count} subscriptions marked as expired`);
        } catch (error) {
            logger.error('CRON subscription cleanup error:', error);
        }
    });

    logger.info('✅ All cron jobs registered');
};

module.exports = { initCronJobs };
