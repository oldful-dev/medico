// ──────────────────────────────────────────────
//  Product Order Fulfillment
//
//  Single source of truth for "create a Delhivery shipment for this
//  ProductOrder" — called from BOTH the automatic path (payment.service.js,
//  fires the instant a payment succeeds) and the admin-triggered manual
//  retry (order.controller.js's retryFulfillment). Previously this logic
//  only existed inline in payment.service.js; a failure there was caught
//  and only logger.error'd — no DB record, nothing admin-visible, no way
//  to retry without duplicating the whole block. This function makes
//  success/failure a persisted, retryable fact instead.
// ──────────────────────────────────────────────

const prisma = require('../config/database');
const { logger } = require('../config/logger');
const delhivery = require('./delhivery.service');
const { recordStatusTransition } = require('../utils/statusTransitions');

/**
 * Attempt to create a Delhivery shipment for a ProductOrder that hasn't
 * been fulfilled yet. Never throws — always returns a result object so
 * callers (auto-fulfillment, manual retry) can react without needing their
 * own try/catch around Delhivery specifics.
 *
 * @param {string} orderId
 * @param {string} [changedBy] - adminId for a manual retry, 'system' for the automatic path
 * @returns {Promise<{ success: boolean, alreadyFulfilled?: boolean, error?: string, awbCode?: string }>}
 */
const attemptFulfillment = async (orderId, changedBy = 'system') => {
    const orderRecord = await prisma.productOrder.findUnique({
        where: { id: orderId },
        include: {
            user: { select: { name: true, phone: true, email: true } },
            product: { select: { name: true, sku: true } },
        },
    });

    if (!orderRecord) {
        return { success: false, error: 'Order not found' };
    }
    if (orderRecord.shiprocketOrderId) {
        // Already fulfilled — the idempotency guard. Both callers rely on
        // this to make a retry after a partial/late response safe: a
        // successful prior attempt is never re-sent to Delhivery.
        return { success: true, alreadyFulfilled: true };
    }

    try {
        if (!(await delhivery.isAvailable())) {
            throw new Error('Delhivery not available (credentials not configured)');
        }

        let addr = {};
        try { addr = JSON.parse(orderRecord.address || '{}'); } catch { /* keep addr = {} */ }

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
                fulfillmentError: null,
                fulfillmentFailedAt: null,
            },
        });
        await recordStatusTransition({
            entityType: 'ProductOrder', entityId: orderRecord.id,
            fromStatus: orderRecord.status, toStatus: 'CONFIRMED',
            changedBy, reason: 'Delhivery shipment created',
        });

        logger.info(`[Fulfillment] Delhivery order created for ${orderRecord.orderCode} → AWB:${awbCode}`);
        return { success: true, awbCode };
    } catch (err) {
        const errorMessage = err?.message || String(err);
        logger.error(`[Fulfillment] Failed for order ${orderRecord.orderCode}:`, errorMessage);

        await prisma.productOrder.update({
            where: { id: orderRecord.id },
            data: { fulfillmentError: errorMessage.slice(0, 500), fulfillmentFailedAt: new Date() },
        }).catch(dbErr => logger.error('[Fulfillment] Failed to persist fulfillmentError:', dbErr.message));

        await recordStatusTransition({
            entityType: 'ProductOrder', entityId: orderRecord.id,
            fromStatus: orderRecord.status, toStatus: orderRecord.status, // no status change — the shipment attempt failed
            changedBy, reason: `Delhivery fulfillment failed: ${errorMessage.slice(0, 200)}`,
        });

        return { success: false, error: errorMessage };
    }
};

module.exports = { attemptFulfillment };
