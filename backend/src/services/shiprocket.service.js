// ──────────────────────────────────────────────
//  Shiprocket Logistics Service
//  Handles: Auth token caching, shipping rate
//  estimation, order creation, AWB assignment,
//  and tracking polling.
// ──────────────────────────────────────────────

const axios = require('axios');
const { logger } = require('../config/logger');

const BASE_URL = process.env.SHIPROCKET_BASE_URL || 'https://apiv2.shiprocket.in/v1/external';
const SR_EMAIL = process.env.SHIPROCKET_EMAIL;
const SR_PASSWORD = process.env.SHIPROCKET_PASSWORD;

// ─── Token Cache (in-memory, valid for ~24h) ──
let _token = null;
let _tokenExpiresAt = 0; // epoch ms

/**
 * Get a valid auth token, refreshing if expired.
 * Throws if credentials are not configured.
 */
async function getToken() {
    if (!SR_EMAIL || !SR_PASSWORD) {
        throw new Error('Shiprocket credentials not configured (SHIPROCKET_EMAIL / SHIPROCKET_PASSWORD)');
    }

    const now = Date.now();
    if (_token && now < _tokenExpiresAt) return _token;

    const res = await axios.post(`${BASE_URL}/auth/login`, {
        email: SR_EMAIL,
        password: SR_PASSWORD,
    }, { timeout: 10000 });

    _token = res.data?.token;
    if (!_token) throw new Error('Shiprocket login did not return a token');

    // Tokens are valid for ~24h; refresh 30 min early
    _tokenExpiresAt = now + (23.5 * 60 * 60 * 1000);
    logger.info('[Shiprocket] Auth token refreshed');
    return _token;
}

/** Build Axios headers with Bearer auth. */
async function authHeaders() {
    const token = await getToken();
    return { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
}

// ──────────────────────────────────────────────
//  SHIPPING RATE ESTIMATION
// ──────────────────────────────────────────────

/**
 * Get available shipping rates for a shipment.
 * @param {object} params
 * @param {string} params.pickupPostcode  Origin pincode (your warehouse)
 * @param {string} params.deliveryPostcode Destination pincode
 * @param {number} params.weight           Weight in kg
 * @param {number} params.cod              1 = COD, 0 = Prepaid
 * @param {number} [params.length]         cm
 * @param {number} [params.breadth]        cm
 * @param {number} [params.height]         cm
 * @param {number} [params.declaredValue]  ₹ declared value (for insurance)
 * @returns {Promise<object[]>} Array of courier rate objects
 */
async function getShippingRates({
    pickupPostcode,
    deliveryPostcode,
    weight,
    cod = 0,
    length = 10,
    breadth = 10,
    height = 10,
    declaredValue = 0,
}) {
    logger.info(`[Shiprocket] Fetching rates from ${pickupPostcode} to ${deliveryPostcode} (weight: ${weight}kg, COD: ${cod})`);
    try {
        const headers = await authHeaders();
        const params = {
            pickup_postcode: pickupPostcode,
            delivery_postcode: deliveryPostcode,
            weight,
            cod,
            length,
            breadth,
            height,
            declared_value: declaredValue,
        };
        const res = await axios.get(`${BASE_URL}/courier/serviceability`, {
            params,
            headers,
            timeout: 12000,
        });

        const couriers = res.data?.data?.available_courier_companies || [];
        logger.info(`[Shiprocket] Serviceability found ${couriers.length} couriers.`);
        return couriers.map(c => ({
            courierId: c.courier_company_id,
            courierName: c.courier_name,
            rate: c.rate,
            estimatedDays: c.estimated_delivery_days,
            cod: c.cod,
        }));
    } catch (err) {
        logger.error('[Shiprocket] getShippingRates error:', err.response?.data || err.message);
        // Return empty (caller should handle fallback)
        return [];
    }
}

// ──────────────────────────────────────────────
//  CREATE ORDER (with or without shipment)
// ──────────────────────────────────────────────

/**
 * Create a Shiprocket order.
 * @param {object} payload
 * @returns {Promise<{shiprocketOrderId: string, shipmentId: string|null}>}
 */
async function createOrder(payload) {
    logger.info(`[Shiprocket] Creating order for code: ${payload.order_id || payload.channel_order_id}`);
    const headers = await authHeaders();
    const res = await axios.post(`${BASE_URL}/orders/create/adhoc`, payload, {
        headers,
        timeout: 15000,
    });

    const data = res.data;
    logger.info(`[Shiprocket] Order created. SR Order ID: ${data.order_id}, Shipment ID: ${data.shipment_id}`);
    return {
        shiprocketOrderId: String(data.order_id || ''),
        shipmentId: data.shipment_id ? String(data.shipment_id) : null,
    };
}

// ──────────────────────────────────────────────
//  GENERATE AWB (assign courier + generate label)
// ──────────────────────────────────────────────

/**
 * Assign a courier and generate AWB for a shipment.
 * @param {string} shipmentId
 * @param {number} [courierId]  Optional preferred courier
 * @returns {Promise<{awbCode: string, courierName: string, trackingUrl: string}>}
 */
async function generateAWB(shipmentId, courierId) {
    logger.info(`[Shiprocket] Generating AWB for shipmentId: ${shipmentId} (preferred courierId: ${courierId || 'none'})`);
    const headers = await authHeaders();
    const body = { shipment_id: [shipmentId] };
    if (courierId) body.courier_id = courierId;

    const res = await axios.post(`${BASE_URL}/courier/assign/awb`, body, {
        headers,
        timeout: 15000,
    });

    const awbData = res.data?.response?.data || {};
    logger.info(`[Shiprocket] AWB generated. Code: ${awbData.awb_code}, Courier: ${awbData.courier_name}`);
    return {
        awbCode: awbData.awb_code || '',
        courierName: awbData.courier_name || '',
        trackingUrl: awbData.awb_code
            ? `https://shiprocket.co/tracking/${awbData.awb_code}`
            : '',
    };
}

// ──────────────────────────────────────────────
//  TRACK SHIPMENT
// ──────────────────────────────────────────────

/**
 * Fetch live tracking data for an AWB code.
 * @param {string} awbCode
 * @returns {Promise<object>} Normalized tracking object
 */
async function trackShipment(awbCode) {
    logger.info(`[Shiprocket] Tracking shipment for AWB: ${awbCode}`);
    try {
        const headers = await authHeaders();
        const res = await axios.get(`${BASE_URL}/courier/track/awb/${awbCode}`, {
            headers,
            timeout: 12000,
        });

        const tracking = res.data?.tracking_data || {};
        const shipmentTrack = tracking.shipment_track?.[0] || {};
        const activities = tracking.shipment_track_activities || [];

        logger.info(`[Shiprocket] Track status for AWB ${awbCode}: ${shipmentTrack.current_status || 'Unknown'}`);
        return {
            awbCode,
            currentStatus: shipmentTrack.current_status || 'Unknown',
            deliveredDate: shipmentTrack.delivered_date || null,
            etd: shipmentTrack.etd || null,
            courierName: shipmentTrack.courier_name || '',
            activities: activities.map(a => ({
                date: a.date,
                activity: a.activity,
                location: a.location,
                status: a.sr_status_label || a.activity,
            })),
            raw: tracking,
        };
    } catch (err) {
        logger.warn('[Shiprocket] trackShipment error:', err.response?.data || err.message);
        return { awbCode, currentStatus: 'Unavailable', activities: [] };
    }
}

// ──────────────────────────────────────────────
//  CANCEL ORDER
// ──────────────────────────────────────────────

/**
 * Cancel a Shiprocket order.
 * @param {string[]} shiprocketOrderIds
 * @returns {Promise<boolean>}
 */
async function cancelOrder(shiprocketOrderIds) {
    logger.info(`[Shiprocket] Cancelling orders: ${shiprocketOrderIds.join(', ')}`);
    try {
        const headers = await authHeaders();
        await axios.post(`${BASE_URL}/orders/cancel`, {
            ids: shiprocketOrderIds.map(Number),
        }, { headers, timeout: 10000 });
        logger.info(`[Shiprocket] Orders cancelled successfully.`);
        return true;
    } catch (err) {
        logger.warn('[Shiprocket] cancelOrder error:', err.response?.data || err.message);
        return false;
    }
}

// ──────────────────────────────────────────────
//  CHECK IF AVAILABLE (health / credentials check)
// ──────────────────────────────────────────────

/**
 * Returns true if Shiprocket credentials are configured and reachable.
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
