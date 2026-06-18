// ──────────────────────────────────────────────
//  Payment & Invoice Controller
// ──────────────────────────────────────────────

const prisma = require('../config/database');
const razorpay = require('../utils/razorpay.service');
const rc = require('../services/redcliffe.service');
const { logger } = require('../config/logger');
const { sendResponse, sendPaginatedResponse, paginate, generateInvoiceNumber, calculateExpiryDate } = require('../utils/helpers');
const { generateInvoicePDF } = require('../utils/pdfGenerator');
const { uploadFile } = require('../utils/storage.service');
const { sendWhatsApp } = require('../utils/notifications');
const emailService = require('../services/email');
const { sendDLTSMS } = require('../utils/fast2sms');
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
        const { userId, bookingId, labOrderId, subscriptionId, productOrderId, meetupId, amount, couponCode, upgradePlanId, upgradeBillingCycle } = req.body;

        let discountAmount = 0;
        let finalAmount = amount;

        // ─── Security: Validate payment amount against DB service price ────────────────
        // Prevent a client from sending amount: 1 and completing a payment for ₹1.
        // The client sends total (base + GST + optional service fee), so we check
        // that it is at least 90% of the service basePrice (no GST floor).
        // EXCEPTION: Skip validation for BLOOD_TEST (uses dynamic Redcliffe pricing) and MEETUP.
        if (bookingId && finalAmount > 0 && !upgradePlanId) {
            const linkedBooking = await prisma.booking.findUnique({
                where: { id: bookingId },
                include: { service: { select: { basePrice: true, slug: true } } }
            });
            const dbBasePrice = linkedBooking?.service?.basePrice;
            const isBloodTest = linkedBooking?.service?.slug === 'blood-test';

            if (!isBloodTest && dbBasePrice && dbBasePrice > 0 && finalAmount < dbBasePrice * 0.9) {
                return res.status(400).json({
                    success: false,
                    message: 'Payment amount does not match service price. Please refresh and try again.'
                });
            }
        }

        // For blood tests, validate against labOrder (no price validation needed, skip it)
        if (labOrderId && finalAmount > 0) {
            const linkedLabOrder = await prisma.labOrder.findUnique({
                where: { id: labOrderId }
            });
            if (!linkedLabOrder) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid lab order. Please refresh and try again.'
                });
            }
        }

        // For meetups, validate against meetup
        if (meetupId && finalAmount > 0) {
            const linkedMeetup = await prisma.meetup.findUnique({
                where: { id: meetupId }
            });
            if (!linkedMeetup) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid meetup. Please refresh and try again.'
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

        let resolvedSubId = subscriptionId;
        if (subscriptionId && subscriptionId.startsWith('RENEW_')) {
            const cleanSubId = subscriptionId.replace('RENEW_', '');
            const existingSub = await prisma.subscription.findUnique({
                where: { id: cleanSubId },
                include: { plan: true }
            });
            if (existingSub) {
                const amt = parseFloat(amount);
                let billingCycle = 'QUARTERLY';
                if (existingSub.plan.yearlyPrice && Math.abs(amt - existingSub.plan.yearlyPrice) < 1) {
                    billingCycle = 'YEARLY';
                } else if (existingSub.plan.biannualPrice && Math.abs(amt - existingSub.plan.biannualPrice) < 1) {
                    billingCycle = 'BIANNUAL';
                } else if (existingSub.plan.quarterlyPrice && Math.abs(amt - existingSub.plan.quarterlyPrice) < 1) {
                    billingCycle = 'QUARTERLY';
                } else {
                    billingCycle = existingSub.billingCycle;
                }

                const { calculateExpiryDate } = require('../utils/helpers');
                const start = new Date(existingSub.expiryDate);
                const expiryDate = calculateExpiryDate(start, billingCycle);

                const renewalPendingSub = await prisma.subscription.create({
                    data: {
                        userId: existingSub.userId,
                        planId: existingSub.planId,
                        billingCycle,
                        startDate: start,
                        expiryDate,
                        amount: amt,
                        status: 'PAYMENT_PENDING',
                        upgradeFromSubId: existingSub.id,
                    }
                });
                resolvedSubId = renewalPendingSub.id;
            }
        } else if (upgradePlanId && upgradeBillingCycle) {
            const upgradePlan = await prisma.plan.findUnique({
                where: { id: upgradePlanId }
            });
            if (!upgradePlan) {
                return res.status(404).json({ success: false, message: 'Upgrade plan not found.' });
            }
            let planPrice = 0;
            if (upgradeBillingCycle === 'YEARLY') planPrice = upgradePlan.yearlyPrice;
            else if (upgradeBillingCycle === 'BIANNUAL') planPrice = upgradePlan.biannualPrice;
            else planPrice = upgradePlan.quarterlyPrice;

            const start = new Date();
            const expiryDate = calculateExpiryDate(start, upgradeBillingCycle);

            const upgradePendingSub = await prisma.subscription.create({
                data: {
                    userId: userId || req.user.id,
                    planId: upgradePlanId,
                    billingCycle: upgradeBillingCycle,
                    startDate: start,
                    expiryDate,
                    amount: planPrice,
                    status: 'PAYMENT_PENDING',
                }
            });
            resolvedSubId = upgradePendingSub.id;
        }

        // Create Razorpay order (Only if amount >= 1 INR)
        if (finalAmount >= 1) {
            const razorpayOrder = await razorpay.createOrder(finalAmount, `receipt_${Date.now()}`);

            // Create payment record
            // For blood tests, use labOrderId; for meetups, don't link to booking; for other services, use bookingId
            const payment = await prisma.payment.create({
                data: {
                    userId: userId || req.user.id,
                    ...(bookingId && { bookingId }),
                    ...(labOrderId && { labOrderId }),
                    ...(resolvedSubId && { subscriptionId: resolvedSubId }),
                    ...(productOrderId && { productOrderId }),
                    amount: finalAmount,
                    ...(couponCode && { couponCode }),
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
                ...(bookingId && { bookingId }),
                ...(resolvedSubId && { subscriptionId: resolvedSubId }),
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
        // ─── TRANSACTION WRAPPER FOR DB UPDATES ──────────────────────────────
        const txResult = await prisma.$transaction(async (tx) => {
            // Update payment record
            const paymentRecord = await tx.payment.update({
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
                    labOrder: true,
                    productOrder: { include: { product: true } },
                },
            });

            let activeSub = null;
            let waiveBooking = true;
            let waivePlatform = true;
            let waiveGst = true;

            // 1. Subscription Promotion
            if (paymentRecord.subscriptionId) {
                let sub = await tx.subscription.findUnique({
                    where: { id: paymentRecord.subscriptionId },
                    include: { plan: { include: { planBenefits: true } } }
                });

                if (sub) {
                    const plan = sub.plan;
                    if (plan && plan.metadata && typeof plan.metadata === 'object') {
                        if (plan.metadata.bookingFeeWaived !== undefined) waiveBooking = !!plan.metadata.bookingFeeWaived;
                        if (plan.metadata.platformFeeWaived !== undefined) waivePlatform = !!plan.metadata.platformFeeWaived;
                        if (plan.metadata.gstOnFeeWaived !== undefined) waiveGst = !!plan.metadata.gstOnFeeWaived;
                    }

                    if (sub.upgradeFromSubId) {
                        const oldSub = await tx.subscription.findUnique({
                            where: { id: sub.upgradeFromSubId },
                            include: { plan: true }
                        });

                        if (oldSub) {
                            if (oldSub.planId === sub.planId) {
                                // Renewal / Extension
                                const updatedOldSub = await tx.subscription.update({
                                    where: { id: oldSub.id },
                                    data: {
                                        expiryDate: sub.expiryDate,
                                        billingCycle: sub.billingCycle,
                                        status: 'ACTIVE',
                                    },
                                    include: { plan: { include: { planBenefits: true } } }
                                });
                                activeSub = updatedOldSub;

                                await tx.subscription.update({
                                    where: { id: sub.id },
                                    data: { status: 'EXPIRED' }
                                });

                                const planBenefits = sub.plan.planBenefits || [];
                                for (const benefit of planBenefits) {
                                    const existingUsage = await tx.subscriptionUsage.findFirst({
                                        where: {
                                            subscriptionId: oldSub.id,
                                            serviceCategory: benefit.serviceCategory
                                        }
                                    });
                                    if (existingUsage) {
                                        await tx.subscriptionUsage.update({
                                            where: { id: existingUsage.id },
                                            data: {
                                                totalAllocated: benefit.freeCount,
                                                usedCount: 0,
                                                lockedCount: 0
                                            }
                                        });
                                    } else {
                                        await tx.subscriptionUsage.create({
                                            data: {
                                                subscriptionId: oldSub.id,
                                                serviceCategory: benefit.serviceCategory,
                                                totalAllocated: benefit.freeCount,
                                                usedCount: 0,
                                                lockedCount: 0
                                            }
                                        });
                                    }
                                }

                                await tx.subscriptionUpgradeHistory.create({
                                    data: {
                                        userId: sub.userId,
                                        oldPlanId: oldSub.planId,
                                        newPlanId: sub.planId,
                                        oldPlanName: oldSub.plan.name,
                                        newPlanName: sub.plan.name,
                                        oldPrice: oldSub.amount,
                                        newPrice: sub.amount,
                                        remainingDays: 0,
                                        creditApplied: 0,
                                        amountPaid: sub.amount,
                                        type: 'RENEW',
                                    }
                                });
                            } else if (sub.plan.tierLevel > oldSub.plan.tierLevel) {
                                // Upgrade
                                await tx.subscription.update({
                                    where: { id: oldSub.id },
                                    data: { status: 'UPGRADED', cancelledAt: new Date() }
                                });

                                const now = new Date();
                                const newExpiry = calculateExpiryDate(now, sub.billingCycle);

                                activeSub = await tx.subscription.update({
                                    where: { id: sub.id },
                                    data: { 
                                        status: 'ACTIVE',
                                        startDate: now,
                                        expiryDate: newExpiry,
                                    },
                                    include: { plan: { include: { planBenefits: true } } }
                                });

                                const usageData = sub.plan.planBenefits.map(benefit => ({
                                    subscriptionId: sub.id,
                                    serviceCategory: benefit.serviceCategory,
                                    totalAllocated: benefit.freeCount,
                                    usedCount: 0,
                                    lockedCount: 0
                                }));
                                if (usageData.length > 0) {
                                    await tx.subscriptionUsage.createMany({ data: usageData });
                                }

                                const nowTime = now.getTime();
                                const start = oldSub.startDate.getTime();
                                const expiry = oldSub.expiryDate.getTime();
                                const daysTotal = Math.max(1, Math.round((expiry - start) / (1000 * 60 * 60 * 24)));
                                const daysRemaining = Math.max(0, Math.round((expiry - nowTime) / (1000 * 60 * 60 * 24)));
                                const dailyRate = oldSub.amount / daysTotal;
                                const creditAmount = Math.round(daysRemaining * dailyRate * 100) / 100;

                                await tx.subscriptionUpgradeHistory.create({
                                    data: {
                                        userId: sub.userId,
                                        oldPlanId: oldSub.planId,
                                        newPlanId: sub.planId,
                                        oldPlanName: oldSub.plan.name,
                                        newPlanName: sub.plan.name,
                                        oldPrice: oldSub.amount,
                                        newPrice: sub.amount + creditAmount,
                                        remainingDays: Math.floor(daysRemaining),
                                        creditApplied: creditAmount,
                                        amountPaid: sub.amount,
                                        type: 'UPGRADE',
                                    }
                                });
                            }
                        }
                    } else {
                        // Normal Activation
                        const now = new Date();
                        const newExpiry = calculateExpiryDate(now, sub.billingCycle);

                        activeSub = await tx.subscription.update({
                            where: { id: paymentRecord.subscriptionId },
                            data: { 
                                status: 'ACTIVE',
                                startDate: now,
                                expiryDate: newExpiry,
                            },
                            include: { plan: { include: { planBenefits: true } } }
                        });

                        const usageData = sub.plan.planBenefits.map(benefit => ({
                            subscriptionId: sub.id,
                            serviceCategory: benefit.serviceCategory,
                            totalAllocated: benefit.freeCount,
                            usedCount: 0,
                            lockedCount: 0
                        }));

                        if (usageData.length > 0) {
                            await tx.subscriptionUsage.createMany({
                                data: usageData
                            });
                        }
                    }
                }
            }

            // 2. Booking Promotion
            if (paymentRecord.booking) {
                let updatedFormData = paymentRecord.booking.formDataJson || {};
                if (typeof updatedFormData !== 'object') {
                    updatedFormData = {};
                }
                if (paymentRecord.subscriptionId) {
                    updatedFormData.bookingFeeWaived = waiveBooking;
                    updatedFormData.platformFeeWaived = waivePlatform;
                    updatedFormData.gstOnFeeWaived = waiveGst;
                }

                await tx.booking.update({
                    where: { id: paymentRecord.booking.id },
                    data: {
                        status: 'CONFIRMED',
                        paymentStatus: 'SUCCESS',
                        slaDeadline: new Date(Date.now() + 4 * 60 * 60 * 1000),
                        formDataJson: updatedFormData,
                    }
                });
            }

            // 3. Lab Order Promotion
            if (paymentRecord.labOrder) {
                await tx.labOrder.update({
                    where: { id: paymentRecord.labOrder.id },
                    data: { status: 'CONFIRMED' }
                });
            }

            // 4. Product Order Promotion
            if (paymentRecord.productOrderId) {
                await tx.productOrder.update({
                    where: { id: paymentRecord.productOrderId },
                    data: { status: 'PAID' },
                });
            }

            return { payment: paymentRecord, subscription: activeSub };
        });

        // Resolve payment with booking / labOrder details loaded
        const payment = await prisma.payment.findUnique({
            where: { id: txResult.payment.id },
            include: {
                user: true,
                booking: { include: { service: true } },
                labOrder: true,
                productOrder: { include: { product: true } },
            }
        });
        let subscription = txResult.subscription;

        // ─── Promote booking notifications ──────
        if (payment.booking) {
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
                }
            }

            const { sendPushToUser } = require('../utils/pushNotification.service');
            const { sendBookingConfirmation } = require('../utils/notifications');

            await sendPushToUser(payment.userId, {
                title: 'Booking Confirmed',
                body: `Your ${payment.booking.service.name} booking (${payment.booking.bookingCode}) has been confirmed.`,
                data: { type: 'booking_created', bookingId: payment.booking.id, bookingCode: payment.booking.bookingCode },
            });

            // WhatsApp BOOKING_CONFIRMED + DLT SMS ORDER_CONFIRMED
            await sendBookingConfirmation({
                user: payment.user,
                bookingCode: payment.booking.bookingCode,
                booking: { serviceName: payment.booking.service?.name },
            }).catch(err => logger.warn('sendBookingConfirmation failed (non-fatal):', err.message));
        }

        // ─── Promote labOrder notifications ─────────────
        if (payment.labOrder) {
            if (payment.labOrder.redcliffeBookingId) {
                try {
                    logger.info(`Finalizing Redcliffe booking ${payment.labOrder.redcliffeBookingId} for labOrder ${payment.labOrder.clientRefId}`);
                    await rc.confirmBooking(payment.labOrder.redcliffeBookingId);
                } catch (rcErr) {
                    logger.error(`Redcliffe confirmation failed for labOrder ${payment.labOrder.clientRefId}: ${rcErr.message}`);
                }
            }

            const { sendPushToUser } = require('../utils/pushNotification.service');
            await sendPushToUser(payment.userId, {
                title: 'Blood Test Booked!',
                body: `Your blood test booking (${payment.labOrder.clientRefId}) has been confirmed.`,
                data: { type: 'lab_booking_confirmed', labOrderId: payment.labOrder.id, bookingId: payment.labOrder.clientRefId },
            });
        }

        // ─── Promote subscription notifications ───────────────────
        if (subscription) {
            const { sendPushToUser } = require('../utils/pushNotification.service');
            await sendPushToUser(payment.userId, {
                title: 'Plan Activated!',
                body: `Your ${subscription.plan.name} plan is now active. Welcome to Ayuxa Family!`,
                data: { type: 'subscription_activated', subscriptionId: subscription.id },
            });

            // WhatsApp PAYMENT_RECEIVED + DLT SMS PAYMENT_RECEIVED — non-fatal
            if (payment.user?.phone) {
                const { sendPaymentReceived } = require('../services/whatsapp');
                const { sendSMS } = require('../services/sms');
                await sendPaymentReceived({
                    phone: payment.user.phone,
                    name: payment.user.name,
                    amount: parseFloat(payment.amount).toFixed(2),
                    userId: payment.userId,
                }).catch(err => logger.warn('subscription WA PAYMENT_RECEIVED failed (non-fatal):', err.message));
                if (payment.user.smsEnabled !== false) {
                    await sendSMS({
                        template: 'PAYMENT_RECEIVED',
                        mobile: payment.user.phone,
                        variables: [payment.user.name, parseFloat(payment.amount).toFixed(2)],
                        userId: payment.userId,
                    }).catch(err => logger.warn('subscription PAYMENT_RECEIVED SMS failed (non-fatal):', err.message));
                }
            }
        }

        // ─── Promote product order: PENDING → PAID → auto-push to Shiprocket ────
        if (payment.productOrderId) {
            await prisma.productOrder.update({
                where: { id: payment.productOrderId },
                data: { status: 'PAID' },
            });

            // Fire-and-forget: create Shiprocket order in background
            setImmediate(async () => {
                try {
                    const delhivery = require('../services/delhivery.service');
                    if (!(await delhivery.isAvailable())) {
                        logger.warn('[Payment] Delhivery not available — skipping auto-fulfillment');
                        return;
                    }
                    const { fulfillOrder: srFulfill } = require('./order.controller');
                    // Build a fake req/res to reuse the controller logic
                    const orderRecord = await prisma.productOrder.findUnique({
                        where: { id: payment.productOrderId },
                        include: {
                            user: { select: { name: true, phone: true, email: true } },
                            product: { select: { name: true, sku: true } },
                        },
                    });
                    if (!orderRecord || orderRecord.shiprocketOrderId) return;

                    // Inline fulfillment (mirrors order.controller fulfillOrder)
                    let addr = {};
                    try { addr = JSON.parse(orderRecord.address || '{}'); } catch {}

                    const lineItemsRaw = orderRecord.items
                        ? (Array.isArray(orderRecord.items) ? orderRecord.items : [])
                        : [{
                            name: orderRecord.product?.name || 'Product',
                            sku: orderRecord.product?.sku || orderRecord.orderCode,
                            units: orderRecord.quantity,
                            selling_price: String(orderRecord.amount),
                        }];

                    const WAREHOUSE_PINCODE = process.env.WAREHOUSE_PINCODE || '560001';
                    const srPayload = {
                        order_id: orderRecord.orderCode,
                        order_date: orderRecord.createdAt.toISOString().slice(0, 10),
                        pickup_location: 'Primary',
                        billing_customer_name: addr.fullName || orderRecord.user.name || 'Customer',
                        billing_last_name: '',
                        billing_address: addr.line1 || 'Address not provided',
                        billing_address_2: addr.line2 || '',
                        billing_city: addr.city || 'Bangalore',
                        billing_pincode: addr.pincode || WAREHOUSE_PINCODE,
                        billing_state: addr.state || 'Karnataka',
                        billing_country: addr.country || 'India',
                        billing_email: orderRecord.user.email || '',
                        billing_phone: addr.phone || orderRecord.user.phone || '',
                        shipping_is_billing: 1,
                        order_items: lineItemsRaw.map(i => {
                            const qty = i.quantity || i.units || 1;
                            const unitPrice = parseFloat(i.price) || parseFloat(i.selling_price) || (parseFloat(i.lineTotal) / qty) || (parseFloat(orderRecord.subtotal) / (orderRecord.quantity || 1));
                            const gstRate = parseFloat(process.env.GST_RATE) || 18;
                            const unitTax = Math.round((unitPrice * gstRate) / 100);
                            const sellingPriceInclusive = unitPrice + unitTax;
                            return {
                                name: i.name,
                                sku: i.sku || i.productId,
                                units: qty,
                                selling_price: String(sellingPriceInclusive),
                                discount: '0',
                                tax: String(gstRate),
                                hsn: '',
                            };
                        }),
                        payment_method: 'Prepaid',
                        shipping_charges: orderRecord.shippingCharge || 0,
                        sub_total: (orderRecord.subtotal || orderRecord.amount) + (orderRecord.tax || 0),
                        total_discount: orderRecord.discount || 0,
                        length: 10, breadth: 10, height: 10, weight: 0.5,
                    };

                    const { shiprocketOrderId, shipmentId } = await delhivery.createOrder(srPayload);
                    let awbCode = '', courierName = '', trackingUrl = '';
                    if (shipmentId) {
                        const awbResult = await delhivery.generateAWB(shipmentId).catch(() => ({}));
                        awbCode = awbResult.awbCode || '';
                        courierName = awbResult.courierName || '';
                        trackingUrl = awbResult.trackingUrl || '';
                    }

                    await prisma.productOrder.update({
                        where: { id: orderRecord.id },
                        data: {
                            shiprocketOrderId,
                            shipmentId,
                            ...(awbCode && { awbCode, courierName, trackingUrl }),
                            status: 'CONFIRMED',
                            shippingStatus: 'CONFIRMED',
                        },
                    });

                    logger.info(`[Payment] Delhivery order auto-created for ${orderRecord.orderCode} → Delhivery:${shiprocketOrderId}, AWB:${awbCode}`);
                } catch (srErr) {
                    logger.error('[Payment] Delhivery auto-fulfillment failed (non-fatal):', srErr.message);
                }
            });
        }

        // Create invoice record (fast — DB only, no PDF yet)
        // GST Matrix: CARE subscription → 0% (healthcare exempt) | HOMEMAKER/wellness/fees → 18%
        let effectiveGstRate = parseFloat(process.env.GST_RATE) || 18;
        if (payment.subscriptionId) {
            try {
                const subForGst = await prisma.subscription.findUnique({
                    where: { id: payment.subscriptionId },
                    select: { plan: { select: { planType: true } } },
                });
                if (subForGst?.plan?.planType === 'CARE') {
                    effectiveGstRate = 0; // Healthcare subscriptions are GST-exempt
                }
            } catch (gstErr) {
                logger.warn('GST plan-type lookup failed (defaulting to 18%):', gstErr.message);
            }
        }
        const subtotal = effectiveGstRate === 0
            ? payment.amount
            : payment.amount / (1 + effectiveGstRate / 100);
        const gstAmount = payment.amount - subtotal;
        const invoiceNumber = await generateInvoiceNumber();
        const invoice = await prisma.invoice.create({
            data: {
                paymentId: payment.id,
                invoiceNumber,
                subtotal,
                gstRate: effectiveGstRate,
                gstAmount,
                totalAmount: payment.amount,
                billingName: payment.user.name,
            },
        });

        // ─── Respond immediately — all heavy work runs in background ──────────
        sendResponse(res, 200, { payment, invoice }, 'Payment verified successfully');

        // PDF generation, GCS upload, email, WA, SMS — all non-blocking after response
        setImmediate(async () => {
            try {
                const pdfBuffer = await generateInvoicePDF({
                    invoiceNumber,
                    invoiceDate: new Date(),
                    subtotal,
                    gstRate: effectiveGstRate,
                    gstAmount,
                    totalAmount: payment.amount,
                    billingName: payment.user.name,
                    description: 'Ayuxa Healthcare Services',
                });

                const { url } = await uploadFile(pdfBuffer, 'invoices', `invoice-${invoiceNumber}.pdf`);

                await prisma.invoice.update({
                    where: { id: invoice.id },
                    data: { pdfUrl: url, emailSentAt: new Date() },
                });

                if (payment.user.email) {
                    await emailService.sendPaymentReceipt({
                        to: payment.user.email,
                        name: payment.user.name,
                        invoiceNumber,
                        amount: parseFloat(payment.amount).toFixed(2),
                        paymentId: payment.razorpayPaymentId,
                        invoicePdfUrl: url,
                        userId: payment.userId,
                    });
                }

                // WhatsApp — PAYMENT_RECEIVED — Var1=name, Var2=amount
                // Only send if this is NOT a booking/labOrder/subscription that already sent its own messages
                if (!payment.booking && !payment.labOrder && !payment.subscriptionId) {
                    const { sendPaymentReceived: sendPaymentWA } = require('../services/whatsapp');
                    await sendPaymentWA({
                        phone: payment.user.phone,
                        name: payment.user.name,
                        amount: parseFloat(payment.amount).toFixed(2),
                        userId: payment.userId,
                    });

                    // DLT SMS — PAYMENT_RECEIVED (215352) — Var1=name, Var2=amount
                    if (payment.user.phone && payment.user.smsEnabled !== false) {
                        const { sendSMS } = require('../services/sms');
                        await sendSMS({
                            template: 'PAYMENT_RECEIVED',
                            mobile: payment.user.phone,
                            variables: [payment.user.name, parseFloat(payment.amount).toFixed(2)],
                            userId: payment.userId,
                        }).catch(err => logger.warn('PAYMENT_RECEIVED SMS failed (non-fatal):', err.message));
                    }
                }
            } catch (bgErr) {
                logger.error('verifyPayment background work failed:', bgErr.message);
            }
        });
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
