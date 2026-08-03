const prisma = require('../config/database');
const rc = require('./redcliffe.service');
const { logger } = require('../config/logger');
const { generateInvoiceNumber, calculateExpiryDate } = require('../utils/helpers');
const { generateInvoicePDF } = require('../utils/pdfGenerator');
const { uploadFile } = require('../utils/storage.service');
const emailService = require('./email');
const { emitToAdmins } = require('./socket.service');

/**
 * Atomic transition of payment to SUCCESS, execution of all entity promotions,
 * invoice creation, and dispatch of SMS, WhatsApp, and Admin WebSocket notifications.
 * Runs EXACTLY ONCE per order due to status check update concurrency lock.
 */
const processPaymentSuccess = async (orderId, paymentId, signature, paymentMethod) => {
    try {
        logger.info(`[PaymentService] Processing payment success for order ${orderId}`);

        const txResult = await prisma.$transaction(async (tx) => {
            // A. Fetch the payment record inside the transaction
            const paymentRecord = await tx.payment.findUnique({
                where: { razorpayOrderId: orderId },
                include: {
                    user: true,
                    booking: { include: { service: true } },
                    labOrder: true,
                    productOrder: { include: { product: true } },
                    invoice: true,
                }
            });

            if (!paymentRecord) {
                throw new Error(`Payment record not found for Razorpay order ID ${orderId}`);
            }

            // B. Concurrency check: If already SUCCESS and all promotions are complete, return early
            let promotionsCompleted = true;
            if (paymentRecord.status !== 'SUCCESS') {
                promotionsCompleted = false;
            }
            if (paymentRecord.booking && paymentRecord.booking.status !== 'CONFIRMED') {
                promotionsCompleted = false;
            }
            if (paymentRecord.labOrder && paymentRecord.labOrder.status !== 'CONFIRMED') {
                promotionsCompleted = false;
            }
            if (paymentRecord.productOrderId && paymentRecord.productOrder && paymentRecord.productOrder.status !== 'PAID') {
                promotionsCompleted = false;
            }
            if (!paymentRecord.invoice) {
                promotionsCompleted = false;
            }

            if (promotionsCompleted) {
                logger.info(`[PaymentService] Order ${orderId} already fully promoted and marked SUCCESS. Skipping promotion.`);
                return { payment: paymentRecord, invoice: paymentRecord.invoice, skipped: true };
            }

            // C. Update payment record inside the transaction (if not already SUCCESS)
            let updatedPayment = paymentRecord;
            if (paymentRecord.status !== 'SUCCESS') {
                updatedPayment = await tx.payment.update({
                    where: { id: paymentRecord.id },
                    data: {
                        status: 'SUCCESS',
                        razorpayPaymentId: paymentId,
                        paymentMethod: paymentMethod || 'CARD',
                        ...(signature && { razorpaySignature: signature })
                    },
                    include: {
                        user: true,
                        booking: { include: { service: true } },
                        labOrder: true,
                        productOrder: { include: { product: true } },
                    }
                });
            } else {
                updatedPayment = await tx.payment.findUnique({
                    where: { id: paymentRecord.id },
                    include: {
                        user: true,
                        booking: { include: { service: true } },
                        labOrder: true,
                        productOrder: { include: { product: true } },
                    }
                });
            }

            let activeSub = null;
            let waiveBooking = true;
            let waivePlatform = true;
            let waiveGst = true;

            // D. Subscription Promotion
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
                                // Renewal
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

            // E. Booking Promotion
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

            // F. Lab Order Promotion
            if (paymentRecord.labOrder) {
                await tx.labOrder.update({
                    where: { id: paymentRecord.labOrder.id },
                    data: { status: 'CONFIRMED' }
                });
            }

            // G. Product Order Promotion
            if (paymentRecord.productOrderId) {
                await tx.productOrder.update({
                    where: { id: paymentRecord.productOrderId },
                    data: { status: 'PAID' },
                });
            }

            // H. Create invoice record (only if it does not already exist)
            let invoice = paymentRecord.invoice;
            let createdInvoice = false;
            if (!invoice) {
                let effectiveGstRate = parseFloat(process.env.GST_RATE) || 18;
                if (paymentRecord.subscriptionId) {
                    let subForGst = await tx.subscription.findUnique({
                        where: { id: paymentRecord.subscriptionId },
                        select: { plan: { select: { planType: true } } },
                    });
                    if (subForGst?.plan?.planType === 'CARE') {
                        effectiveGstRate = 0;
                    }
                }
                const subtotal = effectiveGstRate === 0
                    ? paymentRecord.amount
                    : paymentRecord.amount / (1 + effectiveGstRate / 100);
                const gstAmount = paymentRecord.amount - subtotal;
                const invoiceNumber = await generateInvoiceNumber();

                invoice = await tx.invoice.create({
                    data: {
                        paymentId: paymentRecord.id,
                        invoiceNumber,
                        subtotal,
                        gstRate: effectiveGstRate,
                        gstAmount,
                        totalAmount: paymentRecord.amount,
                        billingName: paymentRecord.user?.name || 'Customer',
                    },
                });
                createdInvoice = true;
            }

            const finalPayment = await tx.payment.findUnique({
                where: { id: paymentRecord.id },
                include: {
                    user: true,
                    booking: { include: { service: true } },
                    labOrder: true,
                    productOrder: { include: { product: true } },
                }
            });

            return { payment: finalPayment || updatedPayment, subscription: activeSub, invoice, createdInvoice };
        });

        if (txResult.skipped) {
            return { payment: txResult.payment, invoice: txResult.invoice };
        }

        const payment = txResult.payment;
        const subscription = txResult.subscription;
        const invoice = txResult.invoice;
        const createdInvoice = txResult.createdInvoice;

        // 2. IMMEDIATE: Real-time Admin WebSocket Notifications (fire before any async work)
        try {
            if (payment?.booking) {
                emitToAdmins('booking_payment_updated', {
                    bookingId: payment.booking.id,
                    bookingCode: payment.booking.bookingCode,
                    paymentStatus: 'SUCCESS',
                    bookingStatus: 'CONFIRMED',
                    userName: payment.user?.name,
                    serviceName: payment.booking.service?.name,
                });
                // Also emit new_booking so admin list refreshes
                emitToAdmins('new_booking', {
                    bookingId: payment.booking.id,
                    bookingCode: payment.booking.bookingCode,
                    serviceType: payment.booking.service?.name,
                    userName: payment.user?.name,
                });
                logger.info(`[PaymentService] Emitted booking_payment_updated + new_booking for ${payment.booking.bookingCode}`);
            }

            if (payment?.productOrderId || payment?.productOrder) {
                const productOrderId = payment.productOrderId || payment.productOrder?.id;
                const orderCode = payment.productOrder?.orderCode || productOrderId;
                emitToAdmins('new_product_order', {
                    orderId: productOrderId,
                    orderCode,
                    amount: payment.amount,
                    userName: payment.user?.name,
                    productName: payment.productOrder?.product?.name || 'Wellness Product',
                    status: 'PAID',
                });
                logger.info(`[PaymentService] Emitted new_product_order for order ${orderCode}`);
            }
        } catch (socketErr) {
            logger.error('[PaymentService] Failed to emit admin socket events:', socketErr.message);
        }

        // 3. Heavy lifting (Non-blocking) — PDF, email, WA, SMS, Delhivery
        if (createdInvoice) {
            setImmediate(async () => {
            try {
                // A. PDF Generation & upload
                const pdfBuffer = await generateInvoicePDF({
                    invoiceNumber: invoice.invoiceNumber,
                    invoiceDate: new Date(),
                    subtotal: invoice.subtotal,
                    gstRate: invoice.gstRate,
                    gstAmount: invoice.gstAmount,
                    totalAmount: payment.amount,
                    billingName: payment.user.name,
                    description: 'Ayuxa Health Tech Platforms Pvt. Ltd.',
                });

                const { url } = await uploadFile(pdfBuffer, 'documents/invoices', `invoice-${invoice.invoiceNumber}.pdf`);

                await prisma.invoice.update({
                    where: { id: invoice.id },
                    data: { pdfUrl: url, emailSentAt: new Date() },
                });

                if (payment.user.email) {
                    await emailService.sendPaymentReceipt({
                        to: payment.user.email,
                        name: payment.user.name,
                        invoiceNumber: invoice.invoiceNumber,
                        amount: parseFloat(payment.amount).toFixed(2),
                        paymentId: payment.razorpayPaymentId,
                        invoicePdfUrl: url,
                        userId: payment.userId,
                    });
                }

                // B. Booking post-processing (Redcliffe integration)
                if (payment.booking) {
                    try {
                        const { sendPushToUser } = require('../utils/pushNotification.service');
                        await sendPushToUser(payment.userId, {
                            title: 'Booking Confirmed',
                            body: `Your ${payment.booking.service?.name || 'Service'} booking (${payment.booking.bookingCode}) has been confirmed.`,
                            data: { type: 'booking_confirmed', bookingId: payment.booking.id, bookingCode: payment.booking.bookingCode },
                        });

                        const { sendBookingConfirmation } = require('../utils/notifications');
                        await sendBookingConfirmation({
                            user: payment.user || {},
                            bookingCode: payment.booking.bookingCode,
                            booking: payment.booking,
                        });
                    } catch (notifyErr) {
                        logger.error('[PaymentService] Booking confirmation notification failed:', notifyErr.message);
                    }

                    if (payment.booking.service?.slug === 'blood-test') {
                        try {
                            const formData = payment.booking.formDataJson || {};
                            await rc.createBookingDirect({
                                patientName: payment.user.name,
                                patientPhone: payment.user.phone,
                                patientEmail: payment.user.email,
                                pincode: formData.pincode,
                                address: formData.address,
                                labOrderId: payment.labOrderId,
                            });
                        } catch (err) {
                            logger.error('[PaymentService] Redcliffe Direct Booking Failed:', err.message);
                        }
                    }
                }

                if (payment.labOrder) {
                    if (payment.labOrder.redcliffeBookingId) {
                        try {
                            await rc.confirmBooking(payment.labOrder.redcliffeBookingId);
                        } catch (rcErr) {
                            logger.error(`[PaymentService] Redcliffe confirmation failed: ${rcErr.message}`);
                        }
                    }

                    const { sendPushToUser } = require('../utils/pushNotification.service');
                    await sendPushToUser(payment.userId, {
                        title: 'Blood Test Booked!',
                        body: `Your blood test booking (${payment.labOrder.clientRefId}) has been confirmed.`,
                        data: { type: 'lab_booking_confirmed', labOrderId: payment.labOrder.id, bookingId: payment.labOrder.clientRefId },
                    });
                }

                if (payment.productOrderId || payment.productOrder) {
                    // Delhivery/Shiprocket auto-fulfillment
                    try {
                        const delhivery = require('./delhivery.service');
                        if (!(await delhivery.isAvailable())) {
                            logger.warn('[PaymentService] Delhivery not available — skipping auto-fulfillment');
                        } else {
                            const orderRecord = await prisma.productOrder.findUnique({
                                where: { id: payment.productOrderId || payment.productOrder?.id },
                                include: {
                                    user: { select: { name: true, phone: true, email: true } },
                                    product: { select: { name: true, sku: true } },
                                },
                            });
                            if (orderRecord && !orderRecord.shiprocketOrderId) {
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
                                logger.info(`[PaymentService] Delhivery order created for ${orderRecord.orderCode} → AWB:${awbCode}`);
                            }
                        }
                    } catch (srErr) {
                        logger.error('[PaymentService] Delhivery auto-fulfillment failed:', srErr.message);
                    }
                }

                if (subscription) {
                    const { sendPushToUser } = require('../utils/pushNotification.service');
                    await sendPushToUser(payment.userId, {
                        title: 'Plan Activated!',
                        body: `Your ${subscription.plan.name} plan is now active. Welcome to Ayuxa Family!`,
                        data: { type: 'subscription_activated', subscriptionId: subscription.id },
                    });
                }

                // C. WhatsApp / SMS Receipt (exactly once!)
                if (createdInvoice && payment.user?.phone) {
                    const { sendPaymentReceived } = require('./whatsapp');
                    const waSuccess = await sendPaymentReceived({
                        phone: payment.user.phone,
                        name: payment.user.name,
                        amount: parseFloat(payment.amount).toFixed(2),
                        userId: payment.userId,
                    }).catch(err => {
                        logger.warn('[PaymentService] WA PAYMENT_RECEIVED failed (non-fatal):', err.message);
                        return false;
                    });

                    if (!waSuccess && payment.user.smsEnabled !== false) {
                        const { sendSMS } = require('./sms');
                        await sendSMS({
                            template: 'PAYMENT_RECEIVED',
                            mobile: payment.user.phone,
                            variables: [payment.user.name, parseFloat(payment.amount).toFixed(2)],
                            userId: payment.userId,
                        }).catch(err => logger.warn('[PaymentService] PAYMENT_RECEIVED SMS failed:', err.message));
                    }
                }
            } catch (bgErr) {
                logger.error('[PaymentService] Background promotion tasks failed:', bgErr.message);
            }
        });
        }

        return { payment, invoice };
    } catch (error) {
        logger.error(`[PaymentService] Error processing payment success for order ${orderId}:`, error.message);
        throw error;
    }
};

module.exports = {
    processPaymentSuccess
};

