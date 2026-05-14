// ──────────────────────────────────────────────
//  Payment & Invoice Controller
// ──────────────────────────────────────────────

const prisma = require('../config/database');
const razorpay = require('../utils/razorpay.service');
const rc = require('../services/redcliffe.service');
const { logger } = require('../config/logger');
const { sendResponse, sendPaginatedResponse, paginate, generateInvoiceNumber } = require('../utils/helpers');
const { generateInvoicePDF } = require('../utils/pdfGenerator');
const { uploadFile } = require('../utils/storage.service');
const { sendEmail, sendWhatsApp } = require('../utils/notifications');
const { emitToAdmins } = require('../services/socket.service');
const crypto = require('crypto');

// GET /api/payments
const getPayments = async (req, res, next) => {
    try {
        const { page, limit, skip } = paginate(req.query);
        const { status, userId, dateFrom, dateTo } = req.query;

        const where = {};
        if (req.cityFilter) {
            where.user = { cityId: req.cityFilter };
        }
        if (status) where.status = status;
        if (userId) where.userId = userId;
        if (dateFrom || dateTo) {
            where.createdAt = {};
            if (dateFrom) where.createdAt.gte = new Date(dateFrom);
            if (dateTo) where.createdAt.lte = new Date(dateTo);
        }

        const [payments, total] = await Promise.all([
            prisma.payment.findMany({
                where,
                skip,
                take: limit,
                include: {
                    user: { select: { name: true, uniqueUserId: true } },
                    booking: { select: { bookingCode: true } },
                    subscription: { select: { id: true }, },
                    invoice: { select: { invoiceNumber: true } },
                },
                orderBy: { createdAt: 'desc' },
            }),
            prisma.payment.count({ where }),
        ]);

        sendPaginatedResponse(res, payments, total, page, limit);
    } catch (error) {
        next(error);
    }
};

// POST /api/payments/initiate  (Create Razorpay order)
const initiatePayment = async (req, res, next) => {
    try {
        const { userId, bookingId, subscriptionId, productOrderId, amount, couponCode } = req.body;

        let discountAmount = 0;
        let finalAmount = amount;

        // ─── Security: Validate payment amount against DB service price ────────────────
        // Prevent a client from sending amount: 1 and completing a payment for ₹1.
        // The client sends total (base + GST + optional service fee), so we check
        // that it is at least 90% of the service basePrice (no GST floor).
        if (bookingId && finalAmount > 0) {
            const linkedBooking = await prisma.booking.findUnique({
                where: { id: bookingId },
                include: { service: { select: { basePrice: true } } }
            });
            const dbBasePrice = linkedBooking?.service?.basePrice;
            if (dbBasePrice && dbBasePrice > 0 && finalAmount < dbBasePrice * 0.9) {
                return res.status(400).json({
                    success: false,
                    message: 'Payment amount does not match service price. Please refresh and try again.'
                });
            }
        }

        // Apply coupon if provided
        if (couponCode) {
            const coupon = await prisma.coupon.findUnique({ where: { code: couponCode } });
            if (coupon && coupon.isActive) {
                if (coupon.discountType === 'percentage') {
                    discountAmount = Math.min(
                        (amount * coupon.discountValue) / 100,
                        coupon.maxDiscount || Infinity
                    );
                } else {
                    discountAmount = coupon.discountValue;
                }
                if (coupon.minOrderValue && amount < coupon.minOrderValue) {
                    discountAmount = 0;
                }
                finalAmount = amount - discountAmount;

                await prisma.coupon.update({
                    where: { id: coupon.id },
                    data: { usedCount: { increment: 1 } },
                });
            }
        }

        // Create Razorpay order (Only if amount >= 1 INR)
        if (finalAmount >= 1) {
            const razorpayOrder = await razorpay.createOrder(finalAmount, `receipt_${Date.now()}`);

            // Create payment record
            const payment = await prisma.payment.create({
                data: {
                    userId: userId || req.user.id,
                    bookingId,
                    subscriptionId,
                    productOrderId,
                    amount: finalAmount,
                    couponCode,
                    discountAmount,
                    razorpayOrderId: razorpayOrder.id,
                    status: 'INITIATED',
                },
            });

            return sendResponse(res, 200, {
                paymentId: payment.id,
                orderId: razorpayOrder.id,
                amount: finalAmount,
                currency: 'INR',
                key: process.env.RAZORPAY_KEY_ID,
            });
        }

        // ─── Handle Zero Amount (Free Service / Payment Later) ───────────────
        // No Razorpay order needed. Create a successful payment record directly.
        const payment = await prisma.payment.create({
            data: {
                userId: userId || req.user.id,
                bookingId,
                subscriptionId,
                amount: finalAmount,
                status: 'SUCCESS',
                paymentMethod: 'CASH', // Default for free/zero-amount
            },
        });

        sendResponse(res, 200, {
            paymentId: payment.id,
            orderId: null,
            amount: 0,
            paymentNotRequired: true,
        }, 'No payment required for this booking');
    } catch (error) {
        next(error);
    }
};

// POST /api/payments/verify
const verifyPayment = async (req, res, next) => {
    try {
        // Accept both camelCase (from mobile SDK) and snake_case (from direct Razorpay)
        const orderId     = req.body.razorpayOrderId   || req.body.razorpay_order_id;
        const paymentId   = req.body.razorpayPaymentId  || req.body.razorpay_payment_id;
        const signature   = req.body.razorpaySignature  || req.body.razorpay_signature;

        // Verify signature
        const isValid = razorpay.verifySignature(orderId, paymentId, signature);

        if (!isValid) {
            // ─── Signature invalid: mark payment + booking as FAILED ───────────────
            try {
                const failedPayment = await prisma.payment.update({
                    where: { razorpayOrderId: orderId },
                    data:  { status: 'FAILED' },
                    select: { bookingId: true },
                });
                if (failedPayment.bookingId) {
                    await prisma.booking.update({
                        where: { id: failedPayment.bookingId },
                        data:  { status: 'PAYMENT_FAILED' },
                    });
                    emitToAdmins('booking_payment_updated', {
                        bookingId: failedPayment.bookingId,
                        paymentStatus: 'FAILED',
                        bookingStatus: 'PAYMENT_FAILED',
                    });
                }
            } catch (updateErr) {
                logger.warn('Could not mark failed payment/booking:', updateErr.message);
            }
            return res.status(400).json({ success: false, message: 'Payment verification failed' });
        }

        // Fetch payment details from Razorpay to get payment method
        let paymentMethod = 'CARD'; // default
        try {
            const razorpayPayment = await razorpay.razorpay.payments.fetch(paymentId);
            paymentMethod = razorpayPayment.method ? razorpayPayment.method.toUpperCase() : 'CARD';
        } catch (fetchErr) {
            logger.warn('Could not fetch Razorpay payment details:', fetchErr.message);
        }

        // Update payment
        const payment = await prisma.payment.update({
            where: { razorpayOrderId: orderId },
            data: {
                razorpayPaymentId: paymentId,
                razorpaySignature: signature,
                status: 'SUCCESS',
                paymentMethod: paymentMethod,
            },
            include: {
                user: true,
                booking: { include: { service: true } },
                productOrder: { include: { product: true } },
            },
        });

        // ─── Promote booking: PAYMENT_PENDING → CONFIRMED + start SLA clock ──────
        if (payment.booking) {
            await prisma.booking.update({
                where: { id: payment.booking.id },
                data: {
                    status: 'CONFIRMED',
                    paymentStatus: 'SUCCESS', // Integrity: mark operational record as paid
                    slaDeadline: new Date(Date.now() + 4 * 60 * 60 * 1000), // SLA starts NOW
                }
            });

            // Emit real-time update to admin
            emitToAdmins('booking_payment_updated', {
                bookingId: payment.booking.id,
                bookingCode: payment.booking.bookingCode,
                paymentStatus: 'SUCCESS',
                bookingStatus: 'CONFIRMED',
                userName: payment.user?.name,
                serviceName: payment.booking.service?.name,
            });

            // ─── PARTNER INTEGRATION: Redcliffe Labs ────────────────────────
            if (payment.booking.service.slug === 'blood-test') {
                try {
                    const formData = payment.booking.formDataJson || {};
                    const rcId = formData.redcliffeBookingId;
                    
                    if (rcId) {
                        logger.info(`Finalizing Redcliffe booking ${rcId} for appointment ${payment.booking.bookingCode}`);
                        await rc.confirmBooking(rcId, true);
                    } else {
                        logger.warn(`Missing redcliffeBookingId for Blood Test booking ${payment.booking.bookingCode}`);
                    }
                } catch (rcErr) {
                    logger.error(`Redcliffe confirmation failed for booking ${payment.booking.bookingCode}:`, rcErr.message);
                    // Note: We don't throw here to avoid failing the whole payment verification
                    // The admin can manually confirm later if needed.
                }
            }

            const { sendPushToUser } = require('../utils/pushNotification.service');
            const { sendBookingConfirmation } = require('../utils/notifications');

            await sendPushToUser(payment.userId, {
                title: 'Booking Confirmed',
                body: `Your ${payment.booking.service.name} booking (${payment.booking.bookingCode}) has been confirmed.`,
                data: { type: 'booking_created', bookingId: payment.booking.id, bookingCode: payment.booking.bookingCode },
            });

            if (payment.user?.phone) {
                await sendBookingConfirmation({ 
                    user: payment.user, 
                    bookingCode: payment.booking.bookingCode, 
                    booking: { serviceName: payment.booking.service.name } 
                });
            }
        }

        // ─── Promote subscription: PAYMENT_PENDING → ACTIVE ───────────────────
        if (payment.subscriptionId) {
            const subscription = await prisma.subscription.update({
                where: { id: payment.subscriptionId },
                data: { status: 'ACTIVE' },
                include: { plan: true }
            });

            const { sendPushToUser } = require('../utils/pushNotification.service');
            await sendPushToUser(payment.userId, {
                title: 'Plan Activated!',
                body: `Your ${subscription.plan.name} plan is now active. Welcome to Ayuxa Family!`,
                data: { type: 'subscription_activated', subscriptionId: subscription.id },
            });
        }

        // ─── Promote product order: PENDING → PAID ────────────────────────────
        if (payment.productOrderId) {
            await prisma.productOrder.update({
                where: { id: payment.productOrderId },
                data: { status: 'PAID' },
            });
        }

        // Generate Invoice
        const gstRate = parseFloat(process.env.GST_RATE) || 18;
        const subtotal = payment.amount / (1 + gstRate / 100);
        const gstAmount = payment.amount - subtotal;

        const invoiceNumber = await generateInvoiceNumber();
        const invoice = await prisma.invoice.create({
            data: {
                paymentId: payment.id,
                invoiceNumber,
                subtotal,
                gstRate,
                gstAmount,
                totalAmount: payment.amount,
                billingName: payment.user.name,
            },
        });

        // Generate PDF
        try {
            const pdfBuffer = await generateInvoicePDF({
                invoiceNumber,
                invoiceDate: new Date(),
                subtotal,
                gstRate,
                gstAmount,
                totalAmount: payment.amount,
                billingName: payment.user.name,
                description: 'Ayuxa Healthcare Services',
            });

            const { url } = await uploadFile(pdfBuffer, 'invoices', `invoice-${invoiceNumber}.pdf`);

            await prisma.invoice.update({
                where: { id: invoice.id },
                data: { pdfUrl: url },
            });

            // Send invoice via Email
            if (payment.user.email) {
                await sendEmail({
                    to: payment.user.email,
                    subject: `Invoice ${invoiceNumber} - Ayuxa Healthcare`,
                    html: `
                        <p>Dear ${payment.user.name},</p>
                        <p>Your payment of ₹${payment.amount} was successful.</p>
                        <p>You can download your GST invoice here: <a href="${url}">Download Invoice</a></p>
                        <p>Best regards,<br/>Ayuxa Team</p>
                    `,
                });
            }

            // Send payment confirmation via WhatsApp (Interakt)
            // Template: ayuxa_receipt — {{1}}=name {{2}}=amount {{3}}=phone {{4}}=email
            await sendWhatsApp({
                phoneNumber: payment.user.phone,
                templateName: 'invoice_confirmation',
                parameters: [
                    payment.user.name, 
                    `₹${payment.amount}`,
                    '+91 94801 98108',
                    'client@ayuxa.com'
                ],
                headerUrl: url,
            });

            await prisma.invoice.update({
                where: { id: invoice.id },
                data: { emailSentAt: new Date() },
            });
        } catch (pdfErr) {
            console.error('Invoice PDF error:', pdfErr);
        }

        sendResponse(res, 200, { payment, invoice }, 'Payment verified successfully');
    } catch (error) {
        next(error);
    }
};

// POST /api/payments/cancel  (called on Razorpay ondismiss or payment failure from app)
// Marks the payment + booking as FAILED so they disappear from Cart/Active views.
const cancelPayment = async (req, res, next) => {
    try {
        const { orderId } = req.body; // razorpay order_id
        if (!orderId) return res.status(400).json({ success: false, message: 'orderId is required' });

        let bookingId = null;
        try {
            const payment = await prisma.payment.update({
                where: { razorpayOrderId: orderId },
                data:  { status: 'FAILED' },
                select: { bookingId: true },
            });
            bookingId = payment.bookingId;
        } catch (e) {
            logger.warn(`cancelPayment: payment record not found for orderId ${orderId}`);
        }

        if (bookingId) {
            await prisma.booking.update({
                where: { id: bookingId },
                data:  { status: 'PAYMENT_FAILED' },
            });
        }

        sendResponse(res, 200, { orderId, bookingId }, 'Payment cancelled');
    } catch (error) {
        next(error);
    }
};

// POST /api/payments/refund
const initiateRefund = async (req, res, next) => {
    try {
        const { paymentId, reason, refundReason, type, refundType, amount, refundAmount: bodyRefundAmount } = req.body;

        const payment = await prisma.payment.findUnique({ where: { id: paymentId } });
        if (!payment) return res.status(404).json({ success: false, message: 'Payment not found' });

        const finalReason = reason || refundReason;
        const finalType = type || refundType;
        const refundAmount = amount || bodyRefundAmount || payment.amount;

        // Razorpay refund
        let refund;
        try {
            refund = await razorpay.razorpay.payments.refund(payment.razorpayPaymentId, {
                amount: Math.round(refundAmount * 100),
            });
        } catch (rzpErr) {
            logger.warn(`Razorpay refund API failed: ${rzpErr.message} — recording refund locally`);
            refund = { id: `refund_${Date.now()}` };
        }

        const updated = await prisma.payment.update({
            where: { id: paymentId },
            data: {
                status: 'REFUND_INITIATED',
                refundId: refund.id,
                refundType: finalType,
                refundReason: finalReason,
                refundAmount,
            },
        });

        sendResponse(res, 200, updated, 'Refund initiated');
    } catch (error) {
        next(error);
    }
};

// GET /api/payments/:id/refund-status
const getRefundStatus = async (req, res, next) => {
    try {
        const payment = await prisma.payment.findUnique({
            where: { id: req.params.id },
            select: { refundId: true, refundType: true, refundAmount: true, refundReason: true, status: true },
        });
        if (!payment) return res.status(404).json({ success: false, message: 'Payment not found' });
        sendResponse(res, 200, payment);
    } catch (error) {
        next(error);
    }
};

// POST /api/payments/apply-coupon
const applyCoupon = async (req, res, next) => {
    try {
        const { couponCode, amount } = req.body;
        const coupon = await prisma.coupon.findUnique({ where: { code: couponCode } });

        if (!coupon || !coupon.isActive) {
            return res.status(400).json({ success: false, message: 'Invalid coupon' });
        }
        if (coupon.validUntil && new Date() > coupon.validUntil) {
            return res.status(400).json({ success: false, message: 'Coupon expired' });
        }
        if (coupon.usageLimit && coupon.usedCount >= coupon.usageLimit) {
            return res.status(400).json({ success: false, message: 'Coupon usage limit reached' });
        }
        if (coupon.minOrderValue && amount < coupon.minOrderValue) {
            return res.status(400).json({ success: false, message: `Minimum order ₹${coupon.minOrderValue}` });
        }

        let discount = 0;
        if (coupon.discountType === 'percentage') {
            discount = Math.min((amount * coupon.discountValue) / 100, coupon.maxDiscount || Infinity);
        } else {
            discount = coupon.discountValue;
        }

        sendResponse(res, 200, {
            valid: true,
            discount,
            finalAmount: amount - discount,
            coupon: { code: coupon.code, description: coupon.description },
        });
    } catch (error) {
        next(error);
    }
};

// GET /api/payments/methods
const getPaymentMethods = async (req, res, next) => {
    try {
        const { type, amount, userId } = req.query;

        const methods = [
            { id: 'upi', type: 'UPI', label: 'UPI (GPay, PhonePe, Paytm)', isDefault: true },
            { id: 'card', type: 'CARD', label: 'Credit / Debit Card', isDefault: false },
        ];

        // ─── COD Restriction logic ─────────────────────────────────────────────
        // 1. COD is NOT allowed for subscriptions
        // 2. COD is NOT allowed if the user has >= 2 active unpaid (COD) bookings
        let allowCash = type !== 'subscription';

        if (allowCash && userId) {
            const activeUnpaid = await prisma.booking.count({
                where: {
                    userId,
                    status: { in: ['PENDING', 'CONFIRMED', 'ASSIGNED', 'IN_PROGRESS'] },
                    paymentStatus: { in: ['PENDING', 'INITIATED'] }
                }
            });
            if (activeUnpaid >= 2) allowCash = false;
        }

        if (allowCash) {
            methods.push({ id: 'cash', type: 'CASH', label: 'Cash on Delivery', isDefault: false });
        }

        sendResponse(res, 200, methods);
    } catch (error) {
        next(error);
    }
};

// PUT /api/payments/:id/status (Admin only)
const updatePaymentStatus = async (req, res, next) => {
    try {
        const { status } = req.body;
        if (!status) return res.status(400).json({ success: false, message: 'Status is required' });

        const payment = await prisma.payment.update({
            where: { id: req.params.id },
            data: { status },
            include: {
                user: { select: { name: true } },
                booking: { select: { bookingCode: true } },
            },
        });

        sendResponse(res, 200, payment, `Payment status updated to ${status}`);
    } catch (error) {
        next(error);
    }
};

// POST /api/payments/manual-success (Admin only)
const manualPaymentSuccess = async (req, res, next) => {
    try {
        const { bookingId } = req.body;

        await prisma.booking.update({
            where: { id: bookingId },
            data: { paymentStatus: 'SUCCESS' }
        });

        // Also create a successful payment record for bookkeeping
        const booking = await prisma.booking.findUnique({
             where: { id: bookingId },
             select: { amount: true, userId: true }
        });

        await prisma.payment.create({
            data: {
                userId: booking.userId,
                bookingId,
                amount: booking.amount,
                status: 'SUCCESS',
                paymentMethod: 'CASH'
            }
        });

        sendResponse(res, 200, null, 'Payment marked as successful');
    } catch (error) {
        next(error);
    }
};

// ─── Saved Cards ──────────────────────────────────────────────────────────────

// GET /api/payments/saved-cards
const getSavedCards = async (req, res, next) => {
    try {
        const cards = await prisma.savedCard.findMany({
            where: { userId: req.user.id },
            orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }],
        });
        sendResponse(res, 200, cards);
    } catch (error) {
        next(error);
    }
};

// POST /api/payments/saved-cards
const addSavedCard = async (req, res, next) => {
    try {
        const { cardLast4, cardBrand, cardType, cardholderName, expiryMonth, expiryYear, upiId, razorpayToken, setDefault } = req.body;

        if (cardType === 'UPI') {
            if (!upiId) return res.status(400).json({ success: false, message: 'UPI ID is required' });
        } else {
            if (!cardLast4 || !cardBrand) return res.status(400).json({ success: false, message: 'Card details are required' });
        }

        if (setDefault) {
            await prisma.savedCard.updateMany({ where: { userId: req.user.id }, data: { isDefault: false } });
        }

        const card = await prisma.savedCard.create({
            data: {
                userId: req.user.id,
                cardLast4: cardLast4 || '0000',
                cardBrand: cardBrand || 'UPI',
                cardType: cardType || 'CARD',
                cardholderName,
                expiryMonth,
                expiryYear,
                upiId,
                razorpayToken,
                isDefault: !!setDefault,
            },
        });

        sendResponse(res, 201, card, 'Card saved successfully');
    } catch (error) {
        next(error);
    }
};

// DELETE /api/payments/saved-cards/:id
const deleteSavedCard = async (req, res, next) => {
    try {
        const card = await prisma.savedCard.findFirst({
            where: { id: req.params.id, userId: req.user.id },
        });
        if (!card) return res.status(404).json({ success: false, message: 'Card not found' });

        await prisma.savedCard.delete({ where: { id: req.params.id } });
        sendResponse(res, 200, null, 'Card removed');
    } catch (error) {
        next(error);
    }
};

// PUT /api/payments/saved-cards/:id/set-default
const setDefaultCard = async (req, res, next) => {
    try {
        const card = await prisma.savedCard.findFirst({
            where: { id: req.params.id, userId: req.user.id },
        });
        if (!card) return res.status(404).json({ success: false, message: 'Card not found' });

        await prisma.savedCard.updateMany({ where: { userId: req.user.id }, data: { isDefault: false } });
        await prisma.savedCard.update({ where: { id: req.params.id }, data: { isDefault: true } });

        sendResponse(res, 200, null, 'Default card updated');
    } catch (error) {
        next(error);
    }
};

module.exports = {
    getPayments, initiatePayment, verifyPayment, cancelPayment,
    initiateRefund, getRefundStatus, applyCoupon, getPaymentMethods,
    updatePaymentStatus, manualPaymentSuccess,
    getSavedCards, addSavedCard, deleteSavedCard, setDefaultCard,
};
