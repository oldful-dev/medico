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
    } catch (err) {
        logger.warn('[Webhook] Malformed JSON payload — event dropped', { message: err.message });
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
            // Never downgrade an already-successful payment (a failed attempt can
            // be followed by a successful retry on the same Razorpay order).
            const existing = await prisma.payment.findUnique({
                where: { razorpayOrderId: p.order_id },
                select: { status: true, bookingId: true, userId: true },
            });
            if (!existing || existing.status === 'SUCCESS') {
                logger.info(`[Webhook] payment.failed ignored for order ${p.order_id} (${existing ? 'already SUCCESS' : 'unknown order'})`);
                break;
            }
            await prisma.payment.updateMany({
                where: { razorpayOrderId: p.order_id },
                data: { status: 'FAILED' },
            });
            // Mirror verifyPayment/cancelPayment: if the app never called them
            // (closed mid-payment), this webhook is the only signal — without
            // this the booking stays PAYMENT_PENDING forever.
            if (existing.bookingId) {
                const { count } = await prisma.booking.updateMany({
                    where: { id: existing.bookingId, status: 'PAYMENT_PENDING' },
                    data: { status: 'PAYMENT_FAILED' },
                });
                if (count > 0) {
                    try {
                        const { emitToAdmins } = require('../services/socket.service');
                        emitToAdmins('booking_payment_updated', {
                            bookingId: existing.bookingId,
                            paymentStatus: 'FAILED',
                            bookingStatus: 'PAYMENT_FAILED',
                        });
                    } catch (emitErr) {
                        logger.warn(`[Webhook] emitToAdmins failed: ${emitErr.message}`);
                    }
                }
            }
            // Tell the customer so they can retry — if the app was closed
            // mid-payment this webhook is their only signal.
            if (existing.userId) {
                try {
                    const { sendPushToUser } = require('../utils/pushNotification.service');
                    await sendPushToUser(existing.userId, {
                        title: 'Payment Failed',
                        body: 'Your payment did not go through. Please try again to confirm your booking.',
                        data: { type: 'payment_failed', bookingId: existing.bookingId || '' },
                    });
                } catch (pushErr) {
                    logger.warn(`[Webhook] payment-failed push failed: ${pushErr.message}`);
                }
            }
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
