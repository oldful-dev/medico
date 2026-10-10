const { Queue, Worker } = require('bullmq');
const { connection } = require('../config/redis');
const { logger } = require('../config/logger');
const redcliffeService = require('../services/redcliffe.service');
const { emitToUser } = require('../services/socket.service');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Redcliffe webhook events that only flip LabOrder.status today, with no
// customer-visible trace of what happened. Mapped onto ActivityUpdate so
// they render on the mobile "Live Updates" timeline the same way admin-driven
// staff assignments already do — no real staff for these, so staffName/staffPhone
// are system-level placeholders (staffPhone left blank so the UI's call button
// doesn't render for a non-existent contact).
const WEBHOOK_ACTIVITY_EVENTS = {
    phleboassigned: { eventType: 'phlebo_assigned', statusDetail: 'Phlebotomist assigned by the lab.' },
    pickup: { eventType: 'sample_collected', statusDetail: 'Sample collected by the phlebotomist.' },
    samplesync: { eventType: 'sample_processing', statusDetail: 'Sample received and processing has started.' },
    cancelled: { eventType: 'booking_cancelled', statusDetail: 'Booking was cancelled.' },
};

async function recordWebhookActivity(order, event_type, realStaffName = null) {
    const cfg = WEBHOOK_ACTIVITY_EVENTS[event_type];
    if (!cfg) return;
    try {
        const activity = await prisma.activityUpdate.create({
            data: {
                labOrderId: order.id,
                eventType: cfg.eventType,
                serviceType: 'Blood Test',
                staffName: realStaffName || 'Redcliffe Labs',
                staffId: realStaffName ? 'redcliffe-phlebo' : 'redcliffe-system',
                staffPhone: '',
                statusDetail: realStaffName
                    ? `${cfg.statusDetail} (${realStaffName})`
                    : cfg.statusDetail,
            },
        });
        emitToUser(order.userId, 'activity_update_created', {
            ...activity,
            clientRefId: order.clientRefId,
        });
    } catch (err) {
        // Non-fatal — the status update itself must not be blocked by this.
        logger.error(`[Queue] Failed to record webhook activity for ${order.id} (${event_type}): ${err.message}`);
    }
}

// Forward-only model of how a partner event may change a lab order. Status never moves backwards, an event
// that arrives after a later stage is still recorded (timeline, tracking link) without changing the status,
// and only a cancelled/failed order is closed to updates.
const WEBHOOK_STATUS_RANK = { PENDING: 0, HOLD_CREATED: 0, PAYMENT_PENDING: 1, CONFIRMED: 2, RESCHEDULED: 2, MANUAL_RECOVERY_NEEDED: 2, SAMPLE_COLLECTED: 3, PROCESSING: 4, REPORT_GENERATED: 5 };
const WEBHOOK_EVENT_TARGET = { pickup: 'SAMPLE_COLLECTED', samplesync: 'PROCESSING', consolidatereport: 'REPORT_GENERATED' };

function planWebhookEvent(order, event_type, data, trackingLink) {
    const rank = WEBHOOK_STATUS_RANK[order.status] ?? 0;
    switch (event_type) {
        case 'phleboassigned':
            return {
                status: order.status,
                updates: trackingLink && trackingLink !== order.trackingLink ? { trackingLink } : {},
                where: { trackingLink: order.trackingLink },
                activity: true,
                sendReport: false,
            };
        case 'pickup':
        case 'samplesync':
        case 'consolidatereport': {
            const target = WEBHOOK_EVENT_TARGET[event_type];
            const advance = rank < WEBHOOK_STATUS_RANK[target];
            const updates = {};
            if (event_type === 'consolidatereport' && !order.reportUrl && data && data.report_link) updates.reportUrl = data.report_link;
            return {
                status: advance ? target : order.status,
                updates,
                where: {},
                activity: event_type !== 'consolidatereport',
                sendReport: event_type === 'consolidatereport' && order.status !== 'REPORT_GENERATED',
            };
        }
        case 'cancelled':
            if (order.status === 'REPORT_GENERATED') return null;
            return { status: 'FAILED', updates: {}, where: {}, activity: true, sendReport: false };
        default:
            return null;
    }
}

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
        // Persist so finance/ops can reconcile against Redcliffe's invoice —
        // a booking we never recorded is still a test Redcliffe may bill us for.
        try {
            await prisma.auditLog.create({
                data: {
                    action: 'REDCLIFFE_WEBHOOK_UNMATCHED',
                    entity: 'RedcliffeBooking',
                    entityId: String(booking_id),
                    newValue: payload,
                },
            });
        } catch (auditErr) {
            logger.error(`[Queue] Failed to persist unmatched webhook for ${booking_id}: ${auditErr.message}`);
        }
        return;
    }

    if (order.processedEvents.includes(uniqueEventId)) {
        logger.info(`[Queue] Idempotent trigger bypassed: ${uniqueEventId} already processed.`);
        return;
    }

    const FULFILLMENT_EVENTS = ['pickup', 'samplesync', 'consolidatereport'];

    // Raise a persistent finance/ops alert whenever Redcliffe fulfils an order we
    // consider cancelled or unpaid — those are tests Redcliffe will bill Ayuxa for
    // with no matching customer revenue.
    const flagLeakage = async (reason) => {
        logger.error(`[Queue] PAYMENT LEAKAGE RISK (${reason}): booking ${booking_id}, order ${order.id}, event ${event_type}`);
        try {
            await prisma.auditLog.create({
                data: {
                    action: 'REDCLIFFE_FULFILLED_WITHOUT_PAYMENT',
                    entity: 'LabOrder',
                    entityId: order.id,
                    newValue: { reason, event_type, booking_id: String(booking_id), localStatus: order.status },
                },
            });
        } catch (auditErr) {
            logger.error(`[Queue] Failed to persist leakage alert for ${order.id}: ${auditErr.message}`);
        }
    };

    if (FULFILLMENT_EVENTS.includes(event_type)) {
        if (order.status === 'FAILED') {
            await flagLeakage('order cancelled/failed locally but Redcliffe is still fulfilling it');
        } else {
            const paid = await prisma.payment.findFirst({
                where: { labOrderId: order.id, status: 'SUCCESS' },
                select: { id: true },
            });
            const isCOD = order.paymentDetails?.razorpayOrderId === 'COD';
            if (!paid && !isCOD) {
                await flagLeakage('no successful payment recorded for this order');
            }
        }
    }

    // ── Apply the event: state-aware, forward-only, and safe under concurrent jobs ──
    // The job reads the order, decides, then writes. With worker concurrency 10 and no
    // per-booking ordering, two events for one booking can interleave, so the write is a
    // compare-and-set on the state that was read (re-read and re-plan on conflict), the status
    // only ever moves forward, and an event is recorded as processed only together with its effect.
    let current = order;
    for (let attempt = 0; attempt < 4; attempt++) {
        if (attempt > 0) {
            current = await prisma.labOrder.findUnique({ where: { redcliffeBookingId: String(booking_id) } });
            if (!current) return;
        }

        if (current.status === 'FAILED') {
            logger.info(`[Queue] Skipping webhook for ${booking_id}, order already cancelled/failed.`);
            return;
        }

        // A reassignment sends a second 'phleboassigned' with a different tracking link, so that
        // event's identity includes the link; every other event is unique per booking and type.
        let phleboInfo = null;
        let trackingLink = null;
        if (event_type === 'phleboassigned') {
            phleboInfo = await redcliffeService.getPhleboTracking(booking_id);
            trackingLink = (phleboInfo && phleboInfo.tracking_link) || (data && data.tracking_link) || null;
        }
        const eventId = event_type === 'phleboassigned' ? `${uniqueEventId}_${trackingLink || 'none'}` : uniqueEventId;
        if (current.processedEvents.includes(eventId)) {
            logger.info(`[Queue] Idempotent trigger bypassed: ${eventId} already processed.`);
            return;
        }

        const plan = planWebhookEvent(current, event_type, data, trackingLink);
        if (!plan) {
            logger.info(`[Queue] Ignoring webhook event ${event_type} for ${booking_id} in state ${current.status}`);
            return;
        }

        // The report notification is de-duplicated by job id, so it is safe to enqueue before the
        // write: a retried or concurrent job cannot send a second one.
        if (plan.sendReport) {
            await notificationQueue.add('send-lab-report', {
                userId: current.userId,
                reportUrl: data.report_link,
                patientName: current.patient?.name
            }, { jobId: `lab-report-${current.id}`, attempts: 3, backoff: { type: 'exponential', delay: 2000 } });
        }

        const result = await prisma.labOrder.updateMany({
            where: { id: current.id, status: current.status, NOT: { processedEvents: { has: eventId } }, ...plan.where },
            data: { status: plan.status, ...plan.updates, processedEvents: { push: eventId } }
        });
        if (result.count === 1) {
            if (plan.activity) {
                await recordWebhookActivity(current, event_type, phleboInfo ? (phleboInfo.phlebo__user__fullname || null) : null);
            }
            logger.info({ job: 'webhook-handler', event: event_type, booking_id, newStatus: plan.status });
            return;
        }
        // Someone else changed this order between our read and write: re-read and re-plan.
    }
    throw new Error(`[Queue] Webhook ${event_type} for ${booking_id} lost the write race 4 times; will be retried`);

}, { connection, concurrency: 10 });


// Lab report notification queue worker
const notificationWorker = new Worker('notification-queue', async job => {
    const { sendWhatsApp, sendEmail } = require('../utils/notifications');
    const prisma = require('../config/database');

    const { userId, reportUrl, patientName } = job.data;

    const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { id: true, name: true, phone: true, email: true, whatsappEnabled: true, status: true }
    });

    if (!user) {
        logger.warn(`[Notification] Lab report: user ${userId} not found`);
        return;
    }

    if (user.status !== 'ACTIVE') {
        logger.info(`[Notification] Lab report: skipping ${userId} (user is ${user.status.toLowerCase()})`);
        return;
    }

    const displayName = patientName || user.name;

    // WhatsApp LAB_REPORT_READY has no approved template on Fast2SMS as of
    // 2026-09-22 (messageId is null in templates.js) — SMS is the only
    // channel for this notification until that's submitted and approved.

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
