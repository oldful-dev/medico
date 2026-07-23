// ──────────────────────────────────────────────
//  Razorpay Webhook Controller
//
//  Active events (configured in Razorpay Dashboard):
//    payment.captured  — payment successful (server-side safety net)
//    payment.failed    — payment failed
//    refund.processed  — refund completed
//
//  Signature verification uses the raw request body (Buffer),
//  which is why webhook.routes.js uses express.raw().
// ──────────────────────────────────────────────

const prisma = require('../config/database');
const crypto = require('crypto');
const { logger } = require('../config/logger');
const { sendPaymentReceived: sendPaymentWA } = require('../services/whatsapp');
const { sendDLTSMS } = require('../utils/fast2sms');

// POST /api/webhooks/razorpay
const razorpayWebhook = async (req, res) => {
    // ── 1. Verify signature ──────────────────────────────
    const signature = req.headers['x-razorpay-signature'];
    const secret    = process.env.RAZORPAY_WEBHOOK_SECRET;

    if (!secret) {
        logger.error('RAZORPAY_WEBHOOK_SECRET is not set');
        return res.status(500).json({ success: false });
    }

    // req.body is a raw Buffer (express.raw middleware in webhook.routes.js)
    const rawBody = Buffer.isBuffer(req.body) ? req.body : Buffer.from(JSON.stringify(req.body));

    const expectedSignature = crypto
        .createHmac('sha256', secret)
        .update(rawBody)
        .digest('hex');

    if (signature !== expectedSignature) {
        logger.warn(`[Webhook] Invalid signature — event dropped`);
        return res.status(400).json({ success: false, message: 'Invalid signature' });
    }

    // ── 2. Parse body ────────────────────────────────────
    let body;
    try {
        body = JSON.parse(rawBody.toString('utf8'));
    } catch {
        return res.status(400).json({ success: false, message: 'Invalid JSON' });
    }

    const event   = body.event;
    const payload = body.payload;

    logger.info(`[Webhook] ${event}`);

    // Always respond 200 immediately — Razorpay retries on non-2xx
    res.json({ success: true });

    // ── 3. Process event (async, non-blocking) ───────────
    processEvent(event, payload).catch(err =>
        logger.error(`[Webhook] processEvent error (${event}):`, err.message)
    );
};

// ── Event handlers ───────────────────────────────────────

async function processEvent(event, payload) {
    switch (event) {

        // ─── payment.captured ────────────────────────────
        // Fires when a payment is successfully captured.
        // This is the server-side safety net — if the app crashed after
        // the user paid but before /api/payments/verify was called,
        // this webhook still marks the payment as SUCCESS.
        case 'payment.captured': {
            const p = payload.payment.entity;
            const method = p.method ? p.method.toUpperCase() : 'CARD';
            try {
                const { processPaymentSuccess } = require('../services/payment.service');
                await processPaymentSuccess(p.order_id, p.id, null, method);
            } catch (err) {
                logger.error(`[Webhook] Failed processing payment.captured for order ${p.order_id}:`, err.message);
            }
            break;
        }

        // ─── payment.failed ──────────────────────────────
        case 'payment.failed': {
            const p = payload.payment.entity;
            await prisma.payment.updateMany({
                where: { razorpayOrderId: p.order_id },
                data: { status: 'FAILED' },
            });
            logger.info(`[Webhook] payment.failed: ${p.id} — ${p.error_description || ''}`);
            break;
        }

        // ─── refund.processed ────────────────────────────
        case 'refund.processed': {
            const r = payload.refund.entity;
            await prisma.payment.updateMany({
                where: { razorpayPaymentId: r.payment_id },
                data: {
                    status: 'REFUNDED',
                    refundedAt: new Date(),
                },
            });
            logger.info(`[Webhook] refund.processed: ${r.id} for payment ${r.payment_id}`);
            break;
        }

        // ─── Unhandled (logged, not an error) ────────────
        default:
            logger.info(`[Webhook] unhandled event: ${event}`);
    }
}

module.exports = { razorpayWebhook };
