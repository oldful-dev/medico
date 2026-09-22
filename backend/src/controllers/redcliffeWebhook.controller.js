const { redcliffeWebhookQueue } = require('../queues/redcliffe.queue');
const { logger } = require('../config/logger');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const ALLOWED_WEBHOOK_IPS = process.env.REDCLIFFE_WEBHOOK_IPS ? process.env.REDCLIFFE_WEBHOOK_IPS.split(',') : [];

/**
 * Receiver for Redcliffe Webhooks. Adds payload to BullMQ.
 * Endpoint: POST /api/v1/webhooks/redcliffe
 * MUST BE IDEMPOTENT AT THE WORKER LEVEL.
 */
exports.handleRedcliffeWebhook = async (req, res) => {
    try {
        let payload = req.body;
        
        // Webhooks coming through router.use(express.raw()) will be Buffers
        if (Buffer.isBuffer(payload)) {
            payload = JSON.parse(payload.toString('utf-8'));
        }
        
        // 1. Security validation (Check auth_key against our .env)
        const expectedAuthKey = process.env.REDCLIFFE_WEBHOOK_SECRET;

        if (expectedAuthKey && req.headers['authorization'] !== expectedAuthKey) {
            logger.warn(`[WebhookController] Unauthorized Webhook Attempt: IP ${req.ip}`);
            return res.status(401).json({ success: false, message: 'Unauthorized' });
        }

        if (ALLOWED_WEBHOOK_IPS.length > 0 && !ALLOWED_WEBHOOK_IPS.includes(req.ip)) {
             logger.warn(`[WebhookController] IP not whitelisted: ${req.ip}`);
             return res.status(403).json({ success: false, message: 'Forbidden IP' });
        }

        // Redcliffe's own docs/PDF and our test harness (redcliffe-api-tests)
        // both use `webhook_type` as the trigger-payload key, but this
        // receiver (and the queue worker) has always read `event_type` —
        // unverified against a real production webhook until now, since the
        // registered URL pointed at a dead domain for 5 months (fixed
        // 2026-09-22). Accept either key defensively rather than assume,
        // and log which one a real webhook actually carries so this can be
        // cleaned up to a single field once confirmed.
        if (payload && !payload.event_type && payload.webhook_type) {
            logger.info(`[WebhookController] Payload used 'webhook_type' (not 'event_type') — booking ${payload.booking_id}: ${payload.webhook_type}`);
            payload.event_type = payload.webhook_type;
        }

        // 2. Validate payload structure
        if (!payload || !payload.booking_id || !payload.event_type) {
            logger.warn('[WebhookController] Malformed Redcliffe payload — dropped', { payload });
            return res.status(400).json({ success: false, message: 'Malformed payload' });
        }

        // 3. Immediately queue for processing to free the HTTP connection
        try {
            await redcliffeWebhookQueue.add(
                `webhook-${payload.event_type}-${payload.booking_id}`,
                { payload }, 
                { attempts: 3, backoff: { type: 'exponential', delay: 5000 } }
            );
        } catch (queueErr) {
            logger.error(`[WebhookController] REDIS DOWN. Direct DB fallback for webhook.`);
            const uniqueEventId = `${payload.booking_id}_${payload.event_type}`;
            const order = await prisma.labOrder.findUnique({ where: { redcliffeBookingId: String(payload.booking_id) }});
            
            if (order && !order.processedEvents.includes(uniqueEventId)) {
                 let nextStatus = order.status;
                 if (payload.event_type === 'consolidatereport') nextStatus = 'REPORT_GENERATED';
                 else if (payload.event_type === 'cancelled') nextStatus = 'FAILED';
                 else if (payload.event_type === 'pickup') nextStatus = 'SAMPLE_COLLECTED';
                 else if (payload.event_type === 'samplesync') nextStatus = 'PROCESSING';

                 await prisma.labOrder.update({
                      where: { id: order.id },
                      data: { status: nextStatus, processedEvents: { push: uniqueEventId } }
                 });
                 logger.info(`[WebhookController] Fallback saved state ${nextStatus} for ${payload.booking_id}`);
            }
        }

        // 4. Return success quickly
        return res.status(200).json({ success: true, message: 'Webhook received.' });
        
    } catch (error) {
        logger.error(`[WebhookController] Error processing webhook: ${error.message}`);
        // Return 200 so Redcliffe doesn't retry on our internal errors unless we specifically want them to.
        return res.status(200).send('Processed with internal errors');
    }
};
