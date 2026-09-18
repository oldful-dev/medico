// ──────────────────────────────────────────────
//  Order Controller
//  Handles multi-item checkout, order listing,
//  Shiprocket rate query, and tracking.
// ──────────────────────────────────────────────

const prisma = require('../config/database');
const { sendResponse, sendPaginatedResponse, paginate, generateOrderCode } = require('../utils/helpers');
const { logger } = require('../config/logger');
const delhivery = require('../services/delhivery.service');
const { generateInvoicePDF } = require('../utils/pdfGenerator');
const { PRODUCT_ORDER_STATUSES, PRODUCT_ORDER_TRANSITIONS, isValidTransition, recordStatusTransition } = require('../utils/statusTransitions');
const { attemptFulfillment } = require('../services/fulfillment.service');
const { getDeliveryFeeConfig, calculateDeliveryFee } = require('../utils/deliveryFee');

const isCODMethod = (paymentMethod) => String(paymentMethod || '').toUpperCase() === 'CASH';

// ─── Product Order Cancellation Notifications ────────────────────────────────
// Shared by the admin status-update endpoint and the user self-cancel
// endpoint, so both routes to CANCELLED send exactly one WhatsApp/SMS.
async function sendProductOrderCancelledNotifications(order) {
    if (!order.user?.phone) return;
    try {
        const { sendOrderCancelled } = require('../services/whatsapp');
        const waSuccess = await sendOrderCancelled({
            phone: order.user.phone, name: order.user.name, orderId: order.orderCode || order.id, userId: order.user.id,
        }).catch(err => {
            logger.warn('[OrderCtrl] WA ORDER_CANCELLED failed (non-fatal):', err.message);
            return false;
        });
        if (!waSuccess && order.user.smsEnabled !== false) {
            const { sendSMS } = require('../services/sms');
            await sendSMS({ template: 'ORDER_CANCELLED_USER', mobile: order.user.phone, variables: [order.user.name, order.orderCode || order.id], userId: order.user.id });
        }
    } catch (notifyErr) {
        logger.warn('[OrderCtrl] Order cancellation notification failed (non-fatal):', notifyErr.message);
    }
    try {
        const { sendPushToUser } = require('../utils/pushNotification.service');
        await sendPushToUser(order.user.id, {
            title: 'Order Cancelled',
            body: `Your order (${order.orderCode || order.id}) has been cancelled. Any paid amount will be refunded within 3-5 business days.`,
            data: { type: 'product_order_cancelled', orderId: order.id },
        });
    } catch (pushErr) {
        logger.warn('[OrderCtrl] Order cancellation push failed (non-fatal):', pushErr.message);
    }
}

// Warehouse origin pincode (change to your actual warehouse pincode)
const WAREHOUSE_PINCODE = process.env.WAREHOUSE_PINCODE || '560001';

// ──────────────────────────────────────────────
//  SHIPPING RATE ESTIMATE
// ──────────────────────────────────────────────

/**
 * POST /api/orders/shipping-rate
 * Body: { pincode, items: [{ productId, quantity }] }
 * Returns the cheapest available courier rate (or 0 if unavailable).
 */
const getShippingRate = async (req, res, next) => {
    try {
        const { pincode, items = [], paymentMethod } = req.body;

        if (!pincode || !items.length) {
            return res.status(400).json({ success: false, message: 'pincode and items are required' });
        }

        // Fetch product price (fee's subtotal basis) + dimensions (Delhivery
        // serviceability/ETA lookup only — the carrier's own rate no longer
        // determines the charge, see calculateDeliveryFee below).
        const productIds = items.map(i => i.productId).filter(Boolean);
        const products = await prisma.product.findMany({
            where: { id: { in: productIds } },
            select: { id: true, price: true, weight: true, length: true, width: true, height: true },
        });

        let subtotal = 0;
        let totalWeight = 0;
        let maxLength = 10, maxWidth = 10, maxHeight = 10;
        for (const item of items) {
            const product = products.find(p => p.id === item.productId);
            if (product) {
                const qty = item.quantity || 1;
                subtotal += (product.price || 0) * qty;
                totalWeight += (product.weight || 0.1) * qty;
                maxLength = Math.max(maxLength, product.length || 10);
                maxWidth = Math.max(maxWidth, product.width || 10);
                maxHeight = Math.max(maxHeight, product.height || 10);
            }
        }
        totalWeight = Math.max(totalWeight, 0.1);

        // Serviceability/ETA display only — failure here must not block the
        // flat-fee charge calculation below, so it's caught locally.
        const rates = await delhivery.getShippingRates({
            pickupPostcode: WAREHOUSE_PINCODE,
            deliveryPostcode: pincode,
            weight: totalWeight,
            length: maxLength,
            breadth: maxWidth,
            height: maxHeight,
            cod: isCODMethod(paymentMethod) ? 1 : 0,
        }).catch(err => {
            logger.warn('[OrderCtrl] Delhivery serviceability lookup failed (non-fatal):', err.message);
            return [];
        });
        const cheapest = rates.sort((a, b) => a.rate - b.rate)[0] || null;

        // Check if user has active HomeMaker plan for shipping waiver
        const activeSub = await prisma.subscription.findFirst({
            where: {
                userId: req.user.id,
                status: 'ACTIVE',
                expiryDate: { gte: new Date() },
                plan: { planType: 'HOMEMAKER' },
            },
        });

        const feeConfig = await getDeliveryFeeConfig();
        const rate = activeSub ? 0 : calculateDeliveryFee(subtotal, isCODMethod(paymentMethod), feeConfig);

        sendResponse(res, 200, {
            available: true,
            rate,
            courierName: cheapest?.courierName || 'Standard Shipping',
            estimatedDays: cheapest?.estimatedDays || '5-7',
            allRates: rates,
            shippingWaived: !!activeSub,
        });
    } catch (error) {
        logger.error('[OrderCtrl] getShippingRate error:', error.message);
        // Graceful degradation: still return a usable response rather than
        // a 500, matching this endpoint's original behavior.
        sendResponse(res, 200, { available: false, rate: 0, courierName: 'Standard Shipping', estimatedDays: '5-7', allRates: [] });
    }
};

// ──────────────────────────────────────────────
//  MULTI-ITEM CART CHECKOUT
// ──────────────────────────────────────────────

/**
 * POST /api/orders/checkout
 * Creates a ProductOrder for a cart (multi-item or single item).
 * The server computes subtotal, shipping, tax, and final amount.
 * Body:
 * {
 *   items: [{ productId, quantity }],
 *   addressId?: string,   // Saved address record ID (preferred)
 *   address?: string,     // Raw address fallback (JSON string)
 *   pincode?: string,     // For shipping calc if no addressId
 * }
 */
const checkoutCart = async (req, res, next) => {
    try {
        const { items, addressId, address, pincode, paymentMethod } = req.body;

        if (!items || !Array.isArray(items) || items.length === 0) {
            return res.status(400).json({ success: false, message: 'Cart items are required' });
        }

        // ─── 1. Validate & fetch products ─────────────────────────────
        const productIds = items.map(i => i.productId);
        const products = await prisma.product.findMany({
            where: { id: { in: productIds }, isEnabled: true },
        });

        if (products.length !== productIds.length) {
            return res.status(400).json({ success: false, message: 'One or more products are unavailable' });
        }

        // Check stock
        for (const item of items) {
            const product = products.find(p => p.id === item.productId);
            if (!product || product.stock < (item.quantity || 1)) {
                return res.status(400).json({
                    success: false,
                    message: `Insufficient stock for: ${product?.name || item.productId}`,
                });
            }
        }

        // ─── 2. Resolve delivery address ──────────────────────────────
        let resolvedAddress = address || null;
        let deliveryPincode = pincode;

        if (addressId) {
            const savedAddress = await prisma.address.findFirst({
                where: { id: addressId, userId: req.user.id },
            });
            if (savedAddress) {
                resolvedAddress = JSON.stringify({
                    fullName: savedAddress.fullName || req.user.name,
                    phone: savedAddress.phone,
                    line1: savedAddress.line1,
                    line2: savedAddress.line2,
                    city: savedAddress.cityName,
                    state: savedAddress.state,
                    pincode: savedAddress.pincode,
                    country: savedAddress.country || 'India',
                    landmark: savedAddress.landmark,
                });
                deliveryPincode = savedAddress.pincode;
            }
        }

        // ─── 3. Server-side price calculation ─────────────────────────
        let subtotal = 0;
        const lineItems = items.map(item => {
            const product = products.find(p => p.id === item.productId);
            const qty = item.quantity || 1;
            const lineTotal = product.price * qty;
            subtotal += lineTotal;
            return {
                productId: product.id,
                name: product.name,
                sku: product.sku || product.id,
                quantity: qty,
                price: product.price,
                mrp: product.mrp,
                lineTotal,
                weight: product.weight || 0.1,
                length: product.length || 10,
                width: product.width || 10,
                height: product.height || 10,
                imageUrl: product.imageUrl,
            };
        });

        // ─── 4. Delivery fee — flat, threshold-based on subtotal + payment method ──
        let shippingCharge = 0;
        if (deliveryPincode) {
            const feeConfig = await getDeliveryFeeConfig();
            shippingCharge = calculateDeliveryFee(subtotal, isCODMethod(paymentMethod), feeConfig);

            // Check if user has active HomeMaker plan for shipping waiver
            const activeSub = await prisma.subscription.findFirst({
                where: {
                    userId: req.user.id,
                    status: 'ACTIVE',
                    expiryDate: { gte: new Date() },
                    plan: { planType: 'HOMEMAKER' },
                },
            });

            if (activeSub) {
                shippingCharge = 0;
            }
        }

        // product.price is tax-inclusive (shown as "Inclusive of all taxes" on the
        // product page) — tax is recorded for the invoice breakdown only, never
        // added on top of subtotal, or the customer is charged GST twice.
        const gstRate = parseFloat(process.env.GST_RATE) || 18;
        const tax = Math.round((subtotal * gstRate) / (100 + gstRate));
        const totalAmount = subtotal + shippingCharge;

        // ─── 5. Create ProductOrder in DB ──────────────────────────────
        let order;
        for (let attempt = 0; attempt < 3; attempt++) {
            try {
                order = await prisma.productOrder.create({
                    data: {
                        orderCode: await generateOrderCode(),
                        userId: req.user.id,
                        // productId left null for multi-item orders; items JSON holds line items
                        quantity: items.reduce((sum, i) => sum + (i.quantity || 1), 0),
                        subtotal,
                        tax,
                        shippingCharge,
                        discount: 0,
                        amount: totalAmount,
                        // Canonical fee split — products: serviceFee = product cost,
                        // deliveryFee = shipping, ayuxaBookingFee = 0 (no booking fee).
                        serviceFee: subtotal,
                        ayuxaBookingFee: 0,
                        deliveryFee: shippingCharge,
                        taxAmount: tax,
                        address: resolvedAddress,
                        status: 'PENDING',
                        items: lineItems,
                    },
                });
                break;
            } catch (err) {
                const isUniqueViolation = err.code === 'P2002' && err.meta?.target?.includes('orderCode');
                if (!isUniqueViolation || attempt === 2) throw err;
            }
        }

        // COD orders are placed immediately (no Razorpay payment step) — send the
        // "order confirmed" notification here. Prepaid orders get theirs once
        // payment actually succeeds, via payment.service.js's processPaymentSuccess.
        //
        // req.user is the raw JWT payload ({ id, type, sessionId }) — it has no
        // name/phone/smsEnabled, so those must be fetched from the DB first.
        if (isCODMethod(paymentMethod)) {
            const notifyUser = await prisma.user.findUnique({
                where: { id: req.user.id },
                select: { id: true, name: true, phone: true, smsEnabled: true },
            });
            if (notifyUser?.phone) {
                try {
                    const { sendBookingConfirmed } = require('../services/whatsapp');
                    const waSuccess = await sendBookingConfirmed({
                        phone: notifyUser.phone, name: notifyUser.name, orderId: order.orderCode, userId: notifyUser.id,
                    }).catch(err => {
                        logger.warn('[OrderCtrl] WA BOOKING_CONFIRMED failed (non-fatal):', err.message);
                        return false;
                    });
                    if (!waSuccess && notifyUser.smsEnabled !== false) {
                        const { sendSMS } = require('../services/sms');
                        await sendSMS({ template: 'ORDER_CONFIRMED', mobile: notifyUser.phone, variables: [notifyUser.name, order.orderCode, '08047280789'], userId: notifyUser.id });
                    }
                } catch (notifyErr) {
                    logger.warn('[OrderCtrl] Order confirmation notification failed (non-fatal):', notifyErr.message);
                }
            }
            try {
                const { sendPushToUser } = require('../utils/pushNotification.service');
                await sendPushToUser(req.user.id, {
                    title: 'Order Confirmed',
                    body: `Your order (${order.orderCode}) has been placed successfully.`,
                    data: { type: 'product_order_confirmed', orderId: order.id },
                });
            } catch (pushErr) {
                logger.warn('[OrderCtrl] Order confirmation push failed (non-fatal):', pushErr.message);
            }
        }

        sendResponse(res, 201, {
            order,
            breakdown: { subtotal, tax, shippingCharge, totalAmount },
        }, 'Cart checkout created — proceed to payment');
    } catch (error) {
        next(error);
    }
};

// ──────────────────────────────────────────────
//  USER: MY ORDERS
// ──────────────────────────────────────────────

/**
 * GET /api/orders/my-orders
 * Returns all product orders for the authenticated user.
 */
const getMyOrders = async (req, res, next) => {
    try {
        const { page, limit, skip } = paginate(req.query);

        const [orders, total] = await Promise.all([
            prisma.productOrder.findMany({
                where: { userId: req.user.id },
                skip,
                take: limit,
                orderBy: { createdAt: 'desc' },
                include: {
                    product: { select: { name: true, imageUrl: true } },
                },
            }),
            prisma.productOrder.count({ where: { userId: req.user.id } }),
        ]);

        sendPaginatedResponse(res, orders, total, page, limit);
    } catch (error) {
        next(error);
    }
};

// ──────────────────────────────────────────────
//  USER: CANCEL ORDER
// ──────────────────────────────────────────────

/**
 * POST /api/orders/:id/cancel
 * User self-cancels their own order, while it's still in a cancellable state
 * (before it's shipped — see PRODUCT_ORDER_TRANSITIONS).
 */
const cancelMyOrder = async (req, res, next) => {
    try {
        const existing = await prisma.productOrder.findFirst({
            where: { id: req.params.id, userId: req.user.id },
            select: { status: true },
        });
        if (!existing) return res.status(404).json({ success: false, message: 'Order not found' });
        if (!isValidTransition(PRODUCT_ORDER_TRANSITIONS, existing.status, 'CANCELLED')) {
            return res.status(400).json({ success: false, message: `Order can no longer be cancelled (current status: ${existing.status}).` });
        }

        const order = await prisma.productOrder.update({
            where: { id: req.params.id },
            data: { status: 'CANCELLED' },
            include: { user: { select: { id: true, name: true, phone: true, smsEnabled: true } } },
        });
        await recordStatusTransition({
            entityType: 'ProductOrder', entityId: order.id,
            fromStatus: existing.status, toStatus: 'CANCELLED',
            changedBy: req.user.id,
        });

        await sendProductOrderCancelledNotifications(order);

        sendResponse(res, 200, order, 'Order cancelled');
    } catch (error) {
        next(error);
    }
};

// ──────────────────────────────────────────────
//  LIVE TRACKING
// ──────────────────────────────────────────────

/**
 * GET /api/orders/:id/tracking
 * Returns live tracking data from Shiprocket.
 */
const getOrderTracking = async (req, res, next) => {
    try {
        const order = await prisma.productOrder.findFirst({
            where: { id: req.params.id, userId: req.user.id },
            include: {
                product: { select: { id: true, name: true, imageUrl: true } },
                user: { select: { name: true, phone: true, email: true } },
            },
        });

        if (!order) return res.status(404).json({ success: false, message: 'Order not found' });

        // If we have an AWB, fetch live data from Delhivery
        let tracking = order.trackingData || null;
        if (order.awbCode) {
            const live = await delhivery.trackShipment(order.awbCode);
            tracking = live;

            // Map carrier status into our canonical status — same mapping as
            // the 30-min cron sync (cron/index.js), so opening this screen
            // reflects delivery/RTO immediately instead of waiting for the
            // next cron tick. RTO stays distinct from a customer CANCELLED.
            let dbStatus = order.status;
            const upper = String(live.currentStatus || '').toUpperCase();
            if (upper.includes('DELIVERED') || upper.includes('DLV')) dbStatus = 'DELIVERED';
            else if (upper.includes('OUT FOR DELIVERY') || upper.includes('OFD')) dbStatus = 'IN_TRANSIT';
            else if (upper.includes('RTO')) dbStatus = 'RETURNED';
            else if (upper.includes('CANCELLED')) dbStatus = 'CANCELLED';

            // Persist the latest tracking snapshot
            await prisma.productOrder.update({
                where: { id: order.id },
                data: {
                    trackingStatus: live.currentStatus,
                    trackingData: live,
                    shippingStatus: live.currentStatus,
                    status: dbStatus,
                },
            });

            if (dbStatus !== order.status) {
                await recordStatusTransition({
                    entityType: 'ProductOrder', entityId: order.id,
                    fromStatus: order.status, toStatus: dbStatus,
                    changedBy: 'system', reason: `Delhivery: ${live.currentStatus}`,
                });
                if (dbStatus === 'DELIVERED' || dbStatus === 'RETURNED') {
                    try {
                        const { sendPushToUser } = require('../utils/pushNotification.service');
                        await sendPushToUser(req.user.id, dbStatus === 'DELIVERED' ? {
                            title: 'Order Delivered',
                            body: `Your order (${order.orderCode}) has been delivered.`,
                            data: { type: 'product_order_delivered', orderId: order.id },
                        } : {
                            title: 'Order Returned',
                            body: `Your order (${order.orderCode}) is being returned. Any paid amount will be refunded within 3-5 business days.`,
                            data: { type: 'product_order_returned', orderId: order.id },
                        });
                    } catch (pushErr) {
                        logger.warn('[OrderCtrl] Tracking-sync push notification failed (non-fatal):', pushErr.message);
                    }
                }
                order.status = dbStatus;
            }
        }

        sendResponse(res, 200, { order, tracking });
    } catch (error) {
        next(error);
    }
};

// ──────────────────────────────────────────────
//  ADMIN: ALL ORDERS
// ──────────────────────────────────────────────

const getAdminOrders = async (req, res, next) => {
    try {
        const { page, limit, skip } = paginate(req.query);
        const { status } = req.query;
        const where = status ? { status } : {};

        const [orders, total] = await Promise.all([
            prisma.productOrder.findMany({
                where,
                skip,
                take: limit,
                include: {
                    product: { select: { name: true, imageUrl: true } },
                    user: { select: { name: true, phone: true, uniqueUserId: true } },
                },
                orderBy: { createdAt: 'desc' },
            }),
            prisma.productOrder.count({ where }),
        ]);

        sendPaginatedResponse(res, orders, total, page, limit);
    } catch (error) {
        next(error);
    }
};

// ──────────────────────────────────────────────
//  ADMIN: FULFILL ORDER (push to Shiprocket)
// ──────────────────────────────────────────────

/**
 * PUT /api/orders/admin/:id/fulfill
 * Creates a Shiprocket order and assigns AWB.
 */
const fulfillOrder = async (req, res, next) => {
    try {
        const order = await prisma.productOrder.findUnique({
            where: { id: req.params.id },
            include: {
                user: { select: { name: true, phone: true, email: true } },
                product: { select: { name: true, sku: true } },
                payments: {
                    where: { status: 'SUCCESS' }
                }
            },
        });

        if (!order) return res.status(404).json({ success: false, message: 'Order not found' });
        if (order.shiprocketOrderId) {
            return res.status(409).json({ success: false, message: 'Order already fulfilled on Delhivery' });
        }
        if (!isValidTransition(PRODUCT_ORDER_TRANSITIONS, order.status, 'DISPATCHED')) {
            return res.status(400).json({ success: false, message: `Cannot fulfill — order is currently ${order.status}` });
        }

        // Parse address
        let addr = {};
        try { addr = JSON.parse(order.address || '{}'); } catch {}

        // Build line items from JSON or single product
        const lineItems = order.items
            ? (Array.isArray(order.items) ? order.items : [])
            : [{
                name: order.product?.name || 'Product',
                sku: order.product?.sku || order.orderCode,
                units: order.quantity,
                selling_price: String(order.amount),
            }];

        // Gather product IDs to fetch weight and dimensions
        const productIds = [];
        if (order.productId) productIds.push(order.productId);
        lineItems.forEach(i => {
            if (i.productId && !productIds.includes(i.productId)) {
                productIds.push(i.productId);
            }
        });

        // Query products to get actual weight and dimensions
        const dbProducts = productIds.length > 0
            ? await prisma.product.findMany({
                where: { id: { in: productIds } },
                select: { id: true, weight: true, length: true, width: true, height: true, sku: true }
              })
            : [];

        let totalWeight = 0;
        let maxLength = 10;
        let maxWidth = 10;
        let maxHeight = 10;

        // Loop and aggregate
        if (lineItems.length > 0) {
            for (const item of lineItems) {
                const pId = item.productId || order.productId;
                const p = dbProducts.find(prod => prod.id === pId);
                const qty = item.quantity || item.units || 1;
                if (p) {
                    totalWeight += (p.weight || 0.1) * qty;
                    maxLength = Math.max(maxLength, p.length || 10);
                    maxWidth = Math.max(maxWidth, p.width || 10);
                    maxHeight = Math.max(maxHeight, p.height || 10);
                } else {
                    totalWeight += 0.1 * qty;
                }
            }
        } else {
            totalWeight = 0.5;
        }
        totalWeight = Math.max(totalWeight, 0.1);

        const isPrepaid = order.status === 'PAID' || (order.payments && order.payments.length > 0);

        const srPayload = {
            order_id: order.orderCode,
            order_date: order.createdAt.toISOString().slice(0, 10),
            pickup_location: 'Primary',
            channel_id: '',
            comment: `Medico Order ${order.orderCode}`,
            billing_customer_name: addr.fullName || order.user.name || 'Customer',
            billing_last_name: '',
            billing_address: addr.line1 || addr.address || 'Address not provided',
            billing_address_2: addr.line2 || '',
            billing_city: addr.city || addr.cityName || 'Bangalore',
            billing_pincode: addr.pincode || '560001',
            billing_state: addr.state || 'Karnataka',
            billing_country: addr.country || 'India',
            billing_email: order.user.email || '',
            billing_phone: addr.phone || order.user.phone || '',
            shipping_is_billing: 1,
            order_items: lineItems.map(i => {
                const dbP = dbProducts.find(p => p.id === i.productId);
                const qty = i.quantity || i.units || 1;
                // i.price is already tax-inclusive — don't add GST again for the manifest.
                const unitPrice = parseFloat(i.price) || (parseFloat(i.lineTotal) / qty) || (parseFloat(order.subtotal) / (order.quantity || 1));
                const gstRate = parseFloat(process.env.GST_RATE) || 18;
                return {
                    name: i.name,
                    sku: i.sku || dbP?.sku || i.productId || order.orderCode,
                    units: qty,
                    selling_price: String(unitPrice),
                    discount: '0',
                    tax: String(gstRate),
                    hsn: '',
                };
            }),
            payment_method: isPrepaid ? 'Prepaid' : 'COD',
            ...( !isPrepaid && { cod_amount: order.amount } ),
            shipping_charges: order.shippingCharge || 0,
            giftwrap_charges: 0,
            transaction_charges: 0,
            total_discount: order.discount || 0,
            sub_total: order.subtotal || order.amount,
            length: maxLength,
            breadth: maxWidth,
            height: maxHeight,
            weight: totalWeight,
        };

        const { shiprocketOrderId, shipmentId } = await delhivery.createOrder(srPayload);

        let awbCode = '', courierName = '', trackingUrl = '';
        if (shipmentId) {
            const awbResult = await delhivery.generateAWB(shipmentId).catch(e => {
                logger.warn('[OrderCtrl] AWB generation failed:', e.message);
                return {};
            });
            awbCode = awbResult.awbCode || '';
            courierName = awbResult.courierName || '';
            trackingUrl = awbResult.trackingUrl || '';
        }

        const updated = await prisma.productOrder.update({
            where: { id: order.id },
            data: {
                shiprocketOrderId,
                shipmentId,
                awbCode: awbCode || undefined,
                courierName: courierName || undefined,
                trackingUrl: trackingUrl || undefined,
                status: 'DISPATCHED',
                shippingStatus: 'DISPATCHED',
            },
        });
        await recordStatusTransition({
            entityType: 'ProductOrder', entityId: updated.id,
            fromStatus: order.status, toStatus: 'DISPATCHED',
            changedBy: req.admin?.id || null,
        });

        logger.info(`[OrderCtrl] Order ${order.orderCode} fulfilled → Delhivery:${shiprocketOrderId}, AWB:${awbCode}`);
        sendResponse(res, 200, updated, 'Order fulfilled and dispatched via Delhivery');
    } catch (error) {
        logger.error('[OrderCtrl] fulfillOrder error:', error.message);
        next(error);
    }
};

// ──────────────────────────────────────────────
//  ADMIN: UPDATE STATUS
// ──────────────────────────────────────────────

const updateOrderStatus = async (req, res, next) => {
    try {
        const { status, estimatedDelivery, forceStatus } = req.body;
        if (!PRODUCT_ORDER_STATUSES.includes(status)) {
            return res.status(400).json({ success: false, message: 'Invalid status' });
        }

        const existing = await prisma.productOrder.findUnique({ where: { id: req.params.id }, select: { status: true } });
        if (!existing) return res.status(404).json({ success: false, message: 'Order not found' });
        if (!forceStatus && !isValidTransition(PRODUCT_ORDER_TRANSITIONS, existing.status, status)) {
            return res.status(400).json({
                success: false,
                message: `Invalid status transition: ${existing.status} → ${status}. Pass forceStatus:true to override.`,
            });
        }

        const order = await prisma.productOrder.update({
            where: { id: req.params.id },
            data: { status, ...(estimatedDelivery && { estimatedDelivery }) },
            include: {
                user: { select: { id: true, name: true, phone: true, smsEnabled: true } },
            },
        });
        await recordStatusTransition({
            entityType: 'ProductOrder', entityId: order.id,
            fromStatus: existing.status, toStatus: status,
            changedBy: req.admin?.id || null,
            forced: !!forceStatus,
        });

        // Fire MEDICINE_OUT_FOR_DELIVERY SMS on DISPATCHED
        if (status === 'DISPATCHED' && order.user?.phone) {
            try {
                const { sendSMS } = require('../services/sms');
                if (order.user.smsEnabled !== false) {
                    await sendSMS({
                        template: 'MEDICINE_OUT_FOR_DELIVERY',
                        mobile: order.user.phone,
                        variables: [order.user.name, order.orderCode || order.id, estimatedDelivery || 'today'],
                        userId: order.user.id,
                    });
                }
            } catch (smsErr) {
                logger.warn('MEDICINE_OUT_FOR_DELIVERY SMS failed (non-fatal):', smsErr.message);
            }
        }

        if (status === 'CANCELLED' && existing.status !== 'CANCELLED') {
            await sendProductOrderCancelledNotifications(order);
        }

        sendResponse(res, 200, order, 'Order status updated');
    } catch (error) {
        next(error);
    }
};

// ──────────────────────────────────────────────
//  DOWNLOAD ORDER INVOICE
// ──────────────────────────────────────────────

/**
 * GET /api/orders/:id/invoice
 * Generates and streams a GST invoice PDF for a product order.
 */
const downloadOrderInvoice = async (req, res, next) => {
    try {
        const order = await prisma.productOrder.findFirst({
            where: { id: req.params.id, userId: req.user.id },
            include: {
                user: { select: { name: true, phone: true } },
                product: { select: { name: true } },
            },
        });

        if (!order) {
            return res.status(404).json({ success: false, message: 'Order not found' });
        }

        // Build line items description from the items JSON array
        const itemLines = Array.isArray(order.items) && order.items.length > 0
            ? order.items.map(i => `${i.name || i.productName || 'Product'} x${i.quantity || 1}`).join(', ')
            : (order.product?.name || 'Wellness Product');

        const gstRate = parseFloat(order.tax && order.subtotal ? ((order.tax / order.subtotal) * 100).toFixed(0) : process.env.GST_RATE) || 18;
        const subtotal = order.subtotal || Math.round((order.amount || 0) * 100 / (100 + gstRate));
        const gstAmount = order.tax || Math.round(subtotal * gstRate / 100);

        const invoiceData = {
            invoiceNumber: order.orderCode || order.id,
            invoiceDate: order.createdAt || new Date(),
            billingName: order.user?.name || 'Customer',
            billingAddress: typeof order.address === 'object'
                ? [order.address.line1, order.address.city, order.address.pincode].filter(Boolean).join(', ')
                : (order.address || 'N/A'),
            description: itemLines,
            subtotal,
            gstRate,
            gstAmount,
            totalAmount: order.amount || (subtotal + gstAmount + (order.shippingCharge || 0)),
        };

        const pdfBuffer = await generateInvoicePDF(invoiceData);

        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename=Invoice_${invoiceData.invoiceNumber}.pdf`);
        res.send(pdfBuffer);
    } catch (error) {
        next(error);
    }
};

// ──────────────────────────────────────────────
//  ADMIN: RETRY FULFILLMENT
// ──────────────────────────────────────────────

/**
 * POST /api/orders/admin/:id/retry-fulfillment
 * Re-attempts Delhivery shipment creation for an order whose automatic
 * fulfillment (on payment success) failed — surfaced via fulfillmentError
 * on the order. Safe to call repeatedly: attemptFulfillment's own
 * shiprocketOrderId check makes an already-fulfilled order a no-op rather
 * than a duplicate shipment.
 */
const retryFulfillment = async (req, res, next) => {
    try {
        const result = await attemptFulfillment(req.params.id, req.admin?.id || null);

        if (!result.success && !result.alreadyFulfilled) {
            return res.status(502).json({ success: false, message: result.error || 'Fulfillment retry failed' });
        }
        if (result.alreadyFulfilled) {
            return res.status(409).json({ success: false, message: 'Order already fulfilled on Delhivery' });
        }

        sendResponse(res, 200, { awbCode: result.awbCode }, 'Fulfillment retried successfully');
    } catch (error) {
        next(error);
    }
};

module.exports = {
    getShippingRate,
    checkoutCart,
    getMyOrders,
    cancelMyOrder,
    getOrderTracking,
    getAdminOrders,
    fulfillOrder,
    updateOrderStatus,
    downloadOrderInvoice,
    retryFulfillment,
};
