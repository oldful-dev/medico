// ──────────────────────────────────────────────
//  Razorpay Webhook Controller
// ──────────────────────────────────────────────

const prisma = require('../config/database');
const crypto = require('crypto');
const { logger } = require('../config/logger');

// POST /api/webhooks/razorpay
const razorpayWebhook = async (req, res, next) => {
    try {
        // Verify webhook signature
        const signature = req.headers['x-razorpay-signature'];
        const expectedSignature = crypto
            .createHmac('sha256', process.env.RAZORPAY_WEBHOOK_SECRET)
            .update(JSON.stringify(req.body))
            .digest('hex');

        if (signature !== expectedSignature) {
            logger.warn('Invalid webhook signature');
            return res.status(400).json({ success: false, message: 'Invalid signature' });
        }

        const event = req.body.event;
        const payload = req.body.payload;

        logger.info(`Razorpay webhook received: ${event}`);

        switch (event) {
            case 'payment.captured': {
                const paymentEntity = payload.payment.entity;
                await prisma.payment.updateMany({
                    where: { razorpayOrderId: paymentEntity.order_id },
                    data: {
                        razorpayPaymentId: paymentEntity.id,
                        status: 'SUCCESS',
                    },
                });
                logger.info(`Payment captured: ${paymentEntity.id}`);
                break;
            }

            case 'payment.failed': {
                const paymentEntity = payload.payment.entity;
                await prisma.payment.updateMany({
                    where: { razorpayOrderId: paymentEntity.order_id },
                    data: { status: 'FAILED' },
                });
                logger.info(`Payment failed: ${paymentEntity.id}`);
                break;
            }

            case 'refund.processed': {
                const refundEntity = payload.refund.entity;
                await prisma.payment.updateMany({
                    where: { razorpayPaymentId: refundEntity.payment_id },
                    data: {
                        status: 'REFUNDED',
                        refundedAt: new Date(),
                    },
                });
                logger.info(`Refund processed: ${refundEntity.id}`);
                break;
            }

            default:
                logger.info(`Unhandled webhook event: ${event}`);
        }

        res.json({ success: true });
    } catch (error) {
        logger.error('Webhook processing error:', error);
        res.status(500).json({ success: false });
    }
};

module.exports = { razorpayWebhook };
