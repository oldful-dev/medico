// ──────────────────────────────────────────────
//  Order Controller
//  Handles multi-item checkout, order listing,
//  Shiprocket rate query, and tracking.
// ──────────────────────────────────────────────

const prisma = require('../config/database');
const { sendResponse, sendPaginatedResponse, paginate } = require('../utils/helpers');
const { logger } = require('../config/logger');
const delhivery = require('../services/delhivery.service');
const { generateInvoicePDF } = require('../utils/pdfGenerator');
const { PRODUCT_ORDER_STATUSES, PRODUCT_ORDER_TRANSITIONS, isValidTransition, recordStatusTransition } = require('../utils/statusTransitions');

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
        const { pincode, items = [] } = req.body;

        if (!pincode || !items.length) {
            return res.status(400).json({ success: false, message: 'pincode and items are required' });
        }

        // Fetch product dimensions from DB
        const productIds = items.map(i => i.productId).filter(Boolean);
        const products = await prisma.product.findMany({
            where: { id: { in: productIds } },
            select: { id: true, weight: true, length: true, width: true, height: true },
        });

        // Aggregate weight (sum of all items * quantity)
        let totalWeight = 0;
        let maxLength = 10, maxWidth = 10, maxHeight = 10;
        for (const item of items) {
            const product = products.find(p => p.id === item.productId);
            if (product) {
                const qty = item.quantity || 1;
                totalWeight += (product.weight || 0.1) * qty;
                maxLength = Math.max(maxLength, product.length || 10);
                maxWidth = Math.max(maxWidth, product.width || 10);
                maxHeight = Math.max(maxHeight, product.height || 10);
            }
        }
        totalWeight = Math.max(totalWeight, 0.1);

        const rates = await delhivery.getShippingRates({
            pickupPostcode: WAREHOUSE_PINCODE,
            deliveryPostcode: pincode,
            weight: totalWeight,
            length: maxLength,
            breadth: maxWidth,
            height: maxHeight,
            cod: 0,
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

        let rate = cheapest?.rate || 0;
        if (activeSub) {
            rate = 0;
        }

        sendResponse(res, 200, {
            available: rates.length > 0,
            rate,
            courierName: cheapest?.courierName || 'Standard Shipping',
            estimatedDays: cheapest?.estimatedDays || '5-7',
            allRates: rates,
            shippingWaived: !!activeSub,
        });
    } catch (error) {
        logger.error('[OrderCtrl] getShippingRate error:', error.message);
        // Graceful degradation: return 0 shipping if Shiprocket unavailable
        sendResponse(res, 200, {
            available: false,
            rate: 0,
            courierName: 'Standard Shipping',
            estimatedDays: '5-7',
            allRates: [],
        });
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
        const { items, addressId, address, pincode } = req.body;

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

        // ─── 4. Get real-time shipping rate ────────────────────────────
        let shippingCharge = 0;
        if (deliveryPincode) {
            const totalWeight = lineItems.reduce((sum, i) => sum + i.weight * i.quantity, 0);
            const rates = await delhivery.getShippingRates({
                pickupPostcode: WAREHOUSE_PINCODE,
                deliveryPostcode: deliveryPincode,
                weight: Math.max(totalWeight, 0.1),
                length: Math.max(...lineItems.map(i => i.length)),
                breadth: Math.max(...lineItems.map(i => i.width)),
                height: Math.max(...lineItems.map(i => i.height)),
            }).catch(() => []);

            if (rates.length > 0) {
                shippingCharge = Math.round(rates.sort((a, b) => a.rate - b.rate)[0].rate);
            }

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

        const gstRate = parseFloat(process.env.GST_RATE) || 18;
        const tax = Math.round((subtotal * gstRate) / 100);
        const totalAmount = subtotal + tax + shippingCharge;

        // ─── 5. Create ProductOrder in DB ──────────────────────────────
        const orderCode = `ORD-${Date.now()}`;
        const order = await prisma.productOrder.create({
            data: {
                orderCode,
                userId: req.user.id,
                // productId left null for multi-item orders; items JSON holds line items
                quantity: items.reduce((sum, i) => sum + (i.quantity || 1), 0),
                subtotal,
                tax,
                shippingCharge,
                discount: 0,
                amount: totalAmount,
                address: resolvedAddress,
                status: 'PENDING',
                items: lineItems,
            },
        });

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

            // Persist the latest tracking snapshot
            await prisma.productOrder.update({
                where: { id: order.id },
                data: {
                    trackingStatus: live.currentStatus,
                    trackingData: live,
                    shippingStatus: live.currentStatus,
                },
            });
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
                const unitPrice = parseFloat(i.price) || (parseFloat(i.lineTotal) / qty) || (parseFloat(order.subtotal) / (order.quantity || 1));
                const gstRate = parseFloat(process.env.GST_RATE) || 18;
                const unitTax = Math.round((unitPrice * gstRate) / 100);
                const sellingPriceInclusive = unitPrice + unitTax;
                return {
                    name: i.name,
                    sku: i.sku || dbP?.sku || i.productId || order.orderCode,
                    units: qty,
                    selling_price: String(sellingPriceInclusive),
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
            sub_total: (order.subtotal || order.amount) + (order.tax || 0),
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

module.exports = {
    getShippingRate,
    checkoutCart,
    getMyOrders,
    getOrderTracking,
    getAdminOrders,
    fulfillOrder,
    updateOrderStatus,
    downloadOrderInvoice,
};
