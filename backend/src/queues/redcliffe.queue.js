const { Queue, Worker } = require('bullmq');
const { connection } = require('../config/redis');
const { logger } = require('../config/logger');
const redcliffeService = require('../services/redcliffe.service');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Queue Definitions
const redcliffeConfirmQueue = new Queue('redcliffe-confirm-queue', { connection });
const redcliffeWebhookQueue = new Queue('redcliffe-webhook-queue', { connection });
const notificationQueue = new Queue('notification-queue', { connection });

// ─── WORKERS ──────────────────────────────

// 1. Confirm Queue Worker (Retries Redcliffe Confirm upon payment success if it transiently failed)
const confirmWorker = new Worker('redcliffe-confirm-queue', async job => {
    const { labOrderId } = job.data;
    
    // Fetch order
    const order = await prisma.labOrder.findUnique({ where: { id: labOrderId }});
    if (!order) throw new Error('Order not found');

    if (order.status !== 'PAYMENT_PENDING') {
        logger.info(`[Queue] Skipping confirm for ${labOrderId} as status is ${order.status}`);
        return;
    }

    // Race condition check: Ensure the Redcliffe hold has not already passed the 30 minute mark
    if (new Date() > new Date(order.holdExpiresAt)) {
        await prisma.labOrder.update({
            where: { id: labOrderId },
            data: { status: 'FAILED' }
        });
        throw new Error("HOLD_EXPIRED"); // Triggers failure to prompt refund
    }
    
    // Call Redcliffe Service
    try {
        await redcliffeService.confirmBooking(order.redcliffeBookingId);
        
        // Success
        await prisma.labOrder.update({
            where: { id: labOrderId },
            data: { status: 'CONFIRMED' }
        });
        
        logger.info({ job: 'confirm', orderId: labOrderId, status: 'CONFIRMED' });
        
        // Assert state correctly saved
        const assertion = await prisma.labOrder.findUnique({ where: { id: labOrderId }});
        if (!assertion.redcliffeBookingId || assertion.status !== 'CONFIRMED') {
            await prisma.labOrder.update({ where: { id: labOrderId }, data: { status: 'MANUAL_RECOVERY_NEEDED' }});
            logger.error(`[Queue] Consistency Assert Failed for confirm ${labOrderId}. Changed to MANUAL_RECOVERY_NEEDED.`);
        }
        
    } catch (error) {
        logger.error(`[Queue] Redcliffe confirm failed for ${labOrderId}: ${error.message}`);
        
        // If out of retries, shift to MANUAL_RECOVERY_NEEDED
        if (job.attemptsMade >= job.opts.attempts - 1) {
            await prisma.labOrder.update({
                where: { id: labOrderId },
                data: { status: 'MANUAL_RECOVERY_NEEDED' }
            });
            logger.error({ job: 'confirm', orderId: labOrderId, status: 'MANUAL_RECOVERY_NEEDED' });
        } else {
            // Only retry if it's a timeout, otherwise just log and throw to retry
            throw error; 
        }
    }
}, { connection, concurrency: 5 });


// 2. Webhook Queue Worker (Processes webhook payload async, idempotent)
const webhookWorker = new Worker('redcliffe-webhook-queue', async job => {
    const { payload } = job.data;
    const { booking_id, event_type, data } = payload;
    
    const uniqueEventId = `${booking_id}_${event_type}`;
    
    const order = await prisma.labOrder.findUnique({ where: { redcliffeBookingId: String(booking_id) }});
    if (!order) {
        logger.warn(`[Queue] Webhook received for unknown booking: ${booking_id}`);
        return; 
    }

    if (order.processedEvents.includes(uniqueEventId)) {
        logger.info(`[Queue] Idempotent trigger bypassed: ${uniqueEventId} already processed.`);
        return;
    }

    // Idempotency check: If already in a terminal state or past this event
    if (order.status === 'FAILED' || order.status === 'REPORT_GENERATED') {
        logger.info(`[Queue] Skipping webhook for ${booking_id}, terminal state already reached.`);
        return;
    }

    let nextStatus = order.status;
    let updates = {};

    switch (event_type) {
        case 'phleboassigned':
            if (order.status === 'CONFIRMED') {
                updates.trackingLink = data.tracking_link || order.trackingLink;
            }
            break;
            
        case 'pickup':
            if (['PENDING', 'CONFIRMED'].includes(order.status)) {
                nextStatus = 'SAMPLE_COLLECTED';
            }
            break;
            
        case 'samplesync':
            if (['PENDING', 'CONFIRMED', 'SAMPLE_COLLECTED'].includes(order.status)) {
                nextStatus = 'PROCESSING';
            }
            break;
            
        case 'consolidatereport':
            if (order.status !== 'REPORT_GENERATED') {
                nextStatus = 'REPORT_GENERATED';
                updates.reportUrl = data.report_link;
                
                // Emitting a notification job to email/whatsapp the patient
                await notificationQueue.add('send-lab-report', {
                    userId: order.userId,
                    reportUrl: data.report_link,
                    patientName: order.patient?.name
                }, { attempts: 3, backoff: { type: 'exponential', delay: 2000 }}); // Retry explicitly set here
            }
            break;
            
        case 'cancelled':
            if (order.status !== 'FAILED') {
                nextStatus = 'FAILED';
                // Trigger operational review or refund
            }
            break;
            
        default:
            logger.info(`[Queue] Unhandled webhook event_type: ${event_type}`);
            return;
    }

    // Apply updates
    await prisma.labOrder.update({
        where: { id: order.id },
        data: {
            status: nextStatus,
            ...updates,
            processedEvents: { push: uniqueEventId }
        }
    });
    
    logger.info({ job: 'webhook-handler', event: event_type, booking_id, newStatus: nextStatus });

}, { connection, concurrency: 10 });


// Lab report notification queue worker
const notificationWorker = new Worker('notification-queue', async job => {
    const { sendWhatsApp, sendEmail } = require('../utils/notifications');
    const prisma = require('../config/database');

    const { userId, reportUrl, patientName } = job.data;

    const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { id: true, name: true, phone: true, email: true, whatsappEnabled: true }
    });

    if (!user) {
        logger.warn(`[Notification] Lab report: user ${userId} not found`);
        return;
    }

    const displayName = patientName || user.name;

    // WhatsApp — Template: LAB_REPORT_READY (ID 20512) — Var1=name
    const { sendLabReportReady } = require('../services/whatsapp');
    await sendLabReportReady({ phone: user.phone, name: displayName, userId: user.id });

    // DLT SMS — LAB_REPORT_READY (215399) — Var1=name
    if (user.phone) {
        const { sendSMS } = require('../services/sms');
        await sendSMS({
            template: 'LAB_REPORT_READY',
            mobile: user.phone,
            variables: [displayName],
            userId: user.id,
        }).catch(err => logger.warn('LAB_REPORT_READY SMS failed (non-fatal):', err.message));
    }

    // Email with report link
    if (user.email) {
        await sendEmail({
            to: user.email,
            subject: 'Your Lab Test Report is Ready — Ayuxa',
            html: `
                <h2>Lab Test Report Available</h2>
                <p>Dear ${displayName},</p>
                <p>Your recent lab test report is now available.</p>
                <p><a href="${reportUrl}" style="background:#0066cc;color:#fff;padding:10px 20px;text-decoration:none;border-radius:4px;">Download Report</a></p>
                <p>You can also view it in the Ayuxa app.</p>
                <p>Best regards,<br>Team Ayuxa</p>
            `,
            userId: user.id,
        });
    }

    logger.info(`[Notification] Lab report sent to ${userId} (${displayName})`);
}, { connection, concurrency: 5 });


// Error logging
[confirmWorker, webhookWorker, notificationWorker].forEach(worker => {
    worker.on('failed', (job, err) => {
        logger.error(`[Queue] Job ${job?.id} failed with error: ${err.message}`);
    });
});

module.exports = {
    redcliffeConfirmQueue,
    redcliffeWebhookQueue,
    notificationQueue
};
