// ──────────────────────────────────────────────
//  Delhivery Logistics Service
//  Handles: Serviceability checks, order creation,
//  tracking pulling, and cancellations.
// ──────────────────────────────────────────────

const axios = require('axios');
const qs = require('qs');
const { logger } = require('../config/logger');

const BASE_URL = process.env.DELHIVERY_BASE_URL || 'https://track.delhivery.com';

/**
 * Returns static token (Delhivery tokens do not expire).
 * Throws if token is not configured.
 */
async function getToken() {
    const token = process.env.DELHIVERY_API_TOKEN;
    if (!token) {
        throw new Error('Delhivery token not configured (DELHIVERY_API_TOKEN)');
    }
    return token;
}

// ──────────────────────────────────────────────
//  SHIPPING SERVICEABILITY & RATE CALCULATION
// ──────────────────────────────────────────────

/**
 * Get available shipping rates for a shipment using Pincode Serviceability.
 * @param {object} params
 * @param {string} params.pickupPostcode  Origin pincode (your warehouse)
 * @param {string} params.deliveryPostcode Destination pincode
 * @param {number} params.weight           Weight in kg
 * @param {number} params.cod              1 = COD, 0 = Prepaid
 * @returns {Promise<object[]>} Array of courier rate objects (Delhivery specific)
 */
async function getShippingRates({
    pickupPostcode,
    deliveryPostcode,
    weight = 0.5,
    cod = 0,
}) {
    logger.info(`[Delhivery] Fetching rate / serviceability from ${pickupPostcode} to ${deliveryPostcode} (weight: ${weight}kg)`);
    try {
        const token = await getToken();
        
        // Pincode serviceability endpoint
        const url = `${BASE_URL}/c/api/pin-codes/json/?filter_codes=${deliveryPostcode}`;
        const res = await axios.get(url, {
            headers: {
                Authorization: `Token ${token}`,
                'Content-Type': 'application/json',
            },
            timeout: 10000,
        });

        const deliveryCodes = res.data?.delivery_codes || [];
        logger.info('[Delhivery] Raw serviceability response: ' + JSON.stringify(res.data));
        if (deliveryCodes.length === 0) {
            logger.warn(`[Delhivery] Pincode ${deliveryPostcode} is not serviceable`);
            return [];
        }

        const info = deliveryCodes[0]?.postal_code || {};
        const isServiceable = info.cod === 'Y' || info.pre_paid === 'Y' || info.pickup === 'Y';
        if (!isServiceable) {
            logger.warn(`[Delhivery] Pincode ${deliveryPostcode} is marked not serviceable`);
            return [];
        }

        // Calculate a reasonable base rate based on weight, e.g., base ₹80 + ₹40 per extra kg
        let rate = 80;
        if (weight > 1) {
            rate += Math.ceil(weight - 1) * 40;
        }

        return [{
            courierId: 1,
            courierName: 'Delhivery',
            rate,
            estimatedDays: 4,
            cod: info.cod === 'Y' || info.cash === 'Y' ? 1 : 0,
        }];
    } catch (err) {
        logger.error('[Delhivery] getShippingRates error:', err.response?.data || err.message);
        return [];
    }
}

// ──────────────────────────────────────────────
//  CREATE ORDER (Shipment booking)
// ──────────────────────────────────────────────

/**
 * Create a Delhivery order shipment.
 * @param {object} payload
 * @returns {Promise<{shiprocketOrderId: string, shipmentId: string|null}>}
 */
async function createOrder(payload) {
    logger.info(`[Delhivery] Booking shipment for order code: ${payload.order_id}`);
    const token = await getToken();
    const pickupLocName = process.env.DELHIVERY_PICKUP_LOCATION || 'Primary';

    // Map order items to description
    const itemsDesc = (payload.order_items || [])
        .map(i => `${i.name} (Qty: ${i.units})`)
        .join(', ');

    // Delhivery expects weight in grams
    const weightInGrams = Math.round((payload.weight || 0.5) * 1000);

    const shipment = {
        order: payload.order_id,
        name: payload.billing_customer_name || 'Customer',
        add: payload.billing_address || 'Address not provided',
        pin: String(payload.billing_pincode || '560001'),
        city: payload.billing_city || 'Bangalore',
        state: payload.billing_state || 'Karnataka',
        country: payload.billing_country || 'India',
        phone: payload.billing_phone || '',
        payment_mode: payload.payment_method === 'COD' ? 'COD' : 'Prepaid',
        cod_amount: payload.payment_method === 'COD' ? Number(payload.cod_amount || payload.sub_total || 0) : 0,
        weight: Number(payload.weight || 0.5),
        length: Number(payload.length || 10),
        breadth: Number(payload.breadth || 10),
        height: Number(payload.height || 10),
        package_desc: itemsDesc.substring(0, 100) || 'Wellness Products',
        package_type: payload.payment_method === 'COD' ? 'COD' : 'Prepaid',
        seller_name: 'Lalitha Medical',
        pickup_location: {
            name: pickupLocName,
        }
    };

    const dataObj = {
        pickup_location: {
            name: pickupLocName,
        },
        shipments: [shipment]
    };
    logger.info('[Delhivery] Outgoing data payload: ' + JSON.stringify(dataObj));

    const requestBody = qs.stringify({
        format: 'json',
        data: JSON.stringify(dataObj)
    });

    const res = await axios.post(`${BASE_URL}/api/cmu/create.json`, requestBody, {
        headers: {
            Authorization: `Token ${token}`,
            'Content-Type': 'application/x-www-form-urlencoded',
            Accept: 'application/json',
        },
        timeout: 15000,
    });

    const data = res.data;
    const pkg = data.packages?.[0] || {};
    const waybill = pkg.waybill || '';
    const success = data.success || (waybill !== '');

    if (!success || !waybill) {
        logger.error('[Delhivery] Order creation failed:', JSON.stringify(data));
        throw new Error(data.rmk || 'Delhivery order creation failed');
    }

    logger.info(`[Delhivery] Shipment created. Waybill: ${waybill}, RefNum: ${pkg.refnum || payload.order_id}`);

    return {
        shiprocketOrderId: waybill, // Map waybill as the unique order ID
        shipmentId: waybill,        // Map waybill as the shipment ID for AWB generation and tracking
    };
}

// ──────────────────────────────────────────────
//  GENERATE AWB (Direct map since AWB is assigned during creation)
// ──────────────────────────────────────────────

/**
 * Assign a courier and generate AWB (Delhivery pre-assigns waybill on order creation).
 * @param {string} shipmentId (This is the Delhivery waybill)
 * @returns {Promise<{awbCode: string, courierName: string, trackingUrl: string}>}
 */
async function generateAWB(shipmentId) {
    logger.info(`[Delhivery] Assigning AWB for waybill: ${shipmentId}`);
    return {
        awbCode: shipmentId,
        courierName: 'Delhivery',
        trackingUrl: `https://track.delhivery.com/tracking/${shipmentId}`,
    };
}

// ──────────────────────────────────────────────
//  TRACK SHIPMENT
// ──────────────────────────────────────────────

/**
 * Fetch live tracking data for an AWB code (Delhivery Waybill).
 * @param {string} awbCode
 * @returns {Promise<object>} Normalized tracking object
 */
async function trackShipment(awbCode) {
    logger.info(`[Delhivery] Tracking shipment for AWB: ${awbCode}`);
    try {
        const token = await getToken();

        const res = await axios.get(`${BASE_URL}/api/v1/packages/json/`, {
            params: {
                token,
                waybill: awbCode,
            },
            headers: {
                Accept: 'application/json',
            },
            timeout: 12000,
        });

        // Parse tracking data (handles potential casing differences robustly)
        const trackingData = res.data?.shipment_data || res.data?.ShipmentData || res.data?.packages || [];
        const shipment = trackingData[0]?.Shipment || trackingData[0]?.shipment || {};
        const scans = trackingData[0]?.Scans || trackingData[0]?.scans || [];
        
        const latestStatusObj = shipment.Status || shipment.status || {};
        const currentStatus = latestStatusObj.Status || latestStatusObj.status || shipment.status || 'Unknown';
        const etd = shipment.expected_delivery || shipment.expected_delivery_date || null;

        logger.info(`[Delhivery] Track status for AWB ${awbCode}: ${currentStatus}`);

        return {
            awbCode,
            currentStatus,
            deliveredDate: currentStatus.toUpperCase().includes('DELIVERED') ? (latestStatusObj.StatusDateTime || new Date()) : null,
            etd,
            courierName: 'Delhivery',
            activities: scans.map(s => {
                const scanDetail = s.ScanDetail || s;
                const activityStr = scanDetail.Scan || scanDetail.status || scanDetail.instructions || 'Update';
                const dateStr = scanDetail.ScanDateTime || scanDetail.date || scanDetail.StatusDateTime || new Date().toISOString();
                const locationStr = scanDetail.ScannedLocation || scanDetail.location || scanDetail.StatusLocation || '';
                return {
                    date: dateStr,
                    activity: activityStr,
                    location: locationStr,
                    status: activityStr,
                };
            }),
            raw: res.data,
        };
    } catch (err) {
        logger.warn('[Delhivery] trackShipment error:', err.response?.data || err.message);
        return { awbCode, currentStatus: 'Unavailable', activities: [] };
    }
}

// ──────────────────────────────────────────────
//  CANCEL ORDER
// ──────────────────────────────────────────────

/**
 * Cancel a Delhivery shipment order.
 * @param {string[]} waybills
 * @returns {Promise<boolean>}
 */
async function cancelOrder(waybills) {
    logger.info(`[Delhivery] Cancelling orders: ${waybills.join(', ')}`);
    try {
        const token = await getToken();

        let allSuccess = true;
        for (const waybill of waybills) {
            try {
                const res = await axios.post(`${BASE_URL}/api/p/edit`, {
                    waybill,
                    cancellation: 'true'
                }, {
                    headers: {
                        Authorization: `Token ${token}`,
                        'Content-Type': 'application/json',
                    },
                    timeout: 10000
                });
                
                logger.info(`[Delhivery] Waybill ${waybill} cancellation response: ${JSON.stringify(res.data)}`);
            } catch (err) {
                logger.warn(`[Delhivery] Waybill ${waybill} cancellation failed:`, err.response?.data || err.message);
                allSuccess = false;
            }
        }
        return allSuccess;
    } catch (err) {
        logger.warn('[Delhivery] cancelOrder error:', err.response?.data || err.message);
        return false;
    }
}

// ──────────────────────────────────────────────
//  CHECK IF AVAILABLE (health / credentials check)
// ──────────────────────────────────────────────

/**
 * Returns true if Delhivery credentials are configured.
 */
async function isAvailable() {
    try {
        await getToken();
        return true;
    } catch {
        return false;
    }
}

module.exports = {
    getToken,
    getShippingRates,
    createOrder,
    generateAWB,
    trackShipment,
    cancelOrder,
    isAvailable,
};
