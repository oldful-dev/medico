// ──────────────────────────────────────────────
//  Payment & Invoice Controller
// ──────────────────────────────────────────────

const prisma = require('../config/database');
const razorpay = require('../utils/razorpay.service');
const { logger } = require('../config/logger');
const { sendResponse, sendPaginatedResponse, paginate, generateInvoiceNumber } = require('../utils/helpers');
const { generateInvoicePDF } = require('../utils/pdfGenerator');
const { uploadFile } = require('../utils/storage.service');
const { sendEmail, sendWhatsApp } = require('../utils/notifications');
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
        const { userId, bookingId, subscriptionId, amount, couponCode } = req.body;

        let discountAmount = 0;
        let finalAmount = amount;

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

        // Create Razorpay order
        const razorpayOrder = await razorpay.createOrder(finalAmount, `receipt_${Date.now()}`);

        // Create payment record
        const payment = await prisma.payment.create({
            data: {
                userId: userId || req.user.id,
                bookingId,
                subscriptionId,
                amount: finalAmount,
                couponCode,
                discountAmount,
                razorpayOrderId: razorpayOrder.id,
                status: 'INITIATED',
            },
        });

        sendResponse(res, 200, {
            paymentId: payment.id,
            orderId: razorpayOrder.id,
            amount: finalAmount,
            currency: 'INR',
            key: process.env.RAZORPAY_KEY_ID,
        });
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
                }
            } catch (updateErr) {
                logger.warn('Could not mark failed payment/booking:', updateErr.message);
            }
            return res.status(400).json({ success: false, message: 'Payment verification failed' });
        }

        // Update payment
        const payment = await prisma.payment.update({
            where: { razorpayOrderId: orderId },
            data: {
                razorpayPaymentId: paymentId,
                razorpaySignature: signature,
                status: 'SUCCESS',
            },
            include: { 
                user: true,
                booking: { include: { service: true } }
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
                description: 'Oldful Healthcare Services',
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
                    subject: `Invoice ${invoiceNumber} - Oldful Healthcare`,
                    html: `
                        <p>Dear ${payment.user.name},</p>
                        <p>Your payment of ₹${payment.amount} was successful.</p>
                        <p>You can download your GST invoice here: <a href="${url}">Download Invoice</a></p>
                        <p>Best regards,<br/>Oldful Team</p>
                    `,
                });
            }

            // Send payment confirmation via WhatsApp (Interakt)
            // Template: oldful_receipt — {{1}}=name {{2}}=amount {{3}}=phone {{4}}=email
            await sendWhatsApp({
                phoneNumber: payment.user.phone,
                templateName: 'invoice_confirmation',
                parameters: [
                    payment.user.name, 
                    `₹${payment.amount}`,
                    '+91 94801 98108',
                    'client@oldful.com'
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
        const { paymentId, reason, type, amount } = req.body;

        const payment = await prisma.payment.findUnique({ where: { id: paymentId } });
        if (!payment) return res.status(404).json({ success: false, message: 'Payment not found' });

        const refundAmount = amount || payment.amount;

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
                refundType: type,
                refundReason: reason,
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

module.exports = {
    getPayments, initiatePayment, verifyPayment, cancelPayment,
    initiateRefund, getRefundStatus, applyCoupon, getPaymentMethods,
    manualPaymentSuccess
};
