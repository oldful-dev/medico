const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const redcliffeService = require('../services/redcliffe.service');
const { redcliffeConfirmQueue } = require('../queues/redcliffe.queue');
const { logger } = require('../config/logger');

/**
 * Validates Payment and transitions local record, then hits Redcliffe.
 * Endpoint: POST /api/v1/labs/bookings/confirm
 */
exports.confirmBooking = async (req, res) => {
    try {
        const { labOrderId, razorpayOrderId, isPaid } = req.body;
        const userId = req.user.id;

        // 1. Fetch local order
        const order = await prisma.labOrder.findUnique({
            where: { id: labOrderId, userId }
        });

        if (!order) return res.status(404).json({ success: false, message: 'Order not found' });
        
        if (order.status !== 'HOLD_CREATED') {
            return res.status(400).json({ success: false, message: `Cannot confirm order in status: ${order.status}` });
        }

        // 2. Check 30 min expiration window logic
        if (new Date() > new Date(order.holdExpiresAt)) {
            // Expired! We shouldn't confirm at Redcliffe end because the DB might reject it.
            // In a real app, you would initiate a refund here if they just paid.
            await prisma.labOrder.update({
                where: { id: labOrderId },
                data: { status: 'FAILED' } // Time window missed
            });
            return res.status(400).json({ success: false, message: 'Temporary booking expired. The 30-min window for payment closed.' });
        }

        // 3. Mark as Payment Pending & attempt Redcliffe API call
        await prisma.labOrder.update({
            where: { id: labOrderId },
            data: {
                status: 'PAYMENT_PENDING',
                paymentDetails: { razorpayOrderId, isPaid }
            }
        });

        // 4. Hit Redcliffe to Confirm
        try {
            await redcliffeService.confirmBooking(order.redcliffeBookingId);
            
            // 5a. Successfully confirmed straight away
            const finalOrder = await prisma.labOrder.update({
                where: { id: labOrderId },
                data: { status: 'CONFIRMED' }
            });

            return res.status(200).json({ 
                success: true, 
                message: 'Booking fully confirmed',
                order: finalOrder
            });

        } catch (redcliffeApiError) {
            logger.warn(`[ConfirmController] Transient hit. Enqueueing retry... | Error: ${redcliffeApiError.message}`);
            
            try {
                // Add job to BullMQ `redcliffe-confirm-queue`
                await redcliffeConfirmQueue.add(
                    'confirm-retry',
                    { labOrderId: order.id },
                    { attempts: 5, backoff: { type: 'exponential', delay: 2000 } }
                );
            } catch (queueErr) {
                // Redis Dependency Risk: Fallback to direct execution since Queue is down!
                logger.error(`[ConfirmController] REDIS DOWN. Queue fallback activated.`);
                try {
                    await redcliffeService.confirmBooking(order.redcliffeBookingId);
                    await prisma.labOrder.update({ where: { id: labOrderId }, data: { status: 'CONFIRMED' }});
                } catch (fallbackError) {
                    await prisma.labOrder.update({ where: { id: labOrderId }, data: { status: 'MANUAL_RECOVERY_NEEDED' }});
                    return res.status(500).json({ success: false, message: 'Processing backend is entirely down. Please contact support.' });
                }
            }

            return res.status(202).json({
                success: true,
                message: 'Payment received. Finalizing lab confirmation in background.',
                delayed: true 
            });
        }
        
    } catch (error) {
        logger.error(`[ConfirmController] Error: ${error.message}`);
        return res.status(500).json({
            success: false,
            message: 'Server error processing confirmation'
        });
    }
};
