const axios = require('axios');
const { logger } = require('../config/logger');

let BASE_URL = process.env.REDCLIFFE_API_BASE_URL || 'https://apiv3.redcliffelabs.com/';
if (BASE_URL.endsWith('/')) BASE_URL = BASE_URL.slice(0, -1);
const API_KEY = process.env.REDCLIFFE_API_KEY;

const client = axios.create({
    baseURL: BASE_URL,
    timeout: 10000,
    headers: {
        'key': API_KEY,
        'Content-Type': 'application/json'
    }
});

// Debug interceptor for unauthorized requests
client.interceptors.response.use(
    res => res,
    error => {
        if (error.response?.status === 403) {
            logger.error(`[Redcliffe] 403 Forbidden: Check API Key and IP Whitelisting. Body: ${JSON.stringify(error.response.data)}`);
        }
        return Promise.reject(error);
    }
);

/**
 * Sanitizes phone number for Redcliffe (10-digits only, no prefix)
 */
const sanitizePhone = (phone) => {
    if (!phone) return "";
    // Remove all non-numeric characters
    const cleaned = phone.toString().replace(/\D/g, '');
    // Take the last 10 digits
    return cleaned.slice(-10);
};

/**
 * Transforms internal mapping format to Redcliffe's specific payload.
 */
const transformToRedcliffePayload = (order, type) => {
    const sanitizedPhone = sanitizePhone(order.patient.phone);

    if (type === 'HOME') {
        const payload = {
            booking_date: new Date().toISOString().split('T')[0],
            collection_date: order.slot?.date,
            collection_slot: parseInt(order.slot?.slotId, 10),
            customer_name: order.patient.name,
            customer_age: parseInt(order.patient.age, 10),
            customer_gender: order.patient.gender.toLowerCase(),
            customer_phonenumber: sanitizedPhone,
            customer_whatsapppnumber: sanitizedPhone, // Note the double 'p'
            customer_address: order.address.line1 || "",
            package_code: order.packages.map(p => p.code), // Explicit 'package_code'
            customer_longitude: parseFloat(order.address.long),
            customer_latitude: parseFloat(order.address.lat),
            is_credit: true,
            pincode: order.address.pincode,
            client_refid: order.clientRefId,
            reference_data: order.clientRefId
        };

        if (order.patient.email) payload.customer_email = order.patient.email;
        if (order.address.landmark) payload.customer_landmark = order.address.landmark;

        if (order.additionalMembers && order.additionalMembers.length > 0) {
            payload.additional_member = order.additionalMembers.map(m => ({
                customer_name: m.name,
                customer_age: String(m.age),
                customer_gender: m.gender.toLowerCase(),
                packages: m.packages.map(p => p.code)
            }));
        } else {
            payload.additional_member = [];
        }

        return payload;
    } else {
        // DROP_OFF
        return {
            booking_date: new Date().toISOString().split('T')[0],
            collection_date: order.slot?.date,
            customer_name: order.patient.name,
            customer_age: order.patient.age,
            customer_gender: order.patient.gender.toLowerCase(),
            customer_phonenumber: sanitizedPhone,
            customer_whatsappnumber: sanitizedPhone,
            packages: order.packages.map(p => p.code),
            customer_longitude: parseFloat(order.address.long),
            customer_latitude: parseFloat(order.address.lat),
            is_credit: true,
            pincode: order.address.pincode,
            landmark: order.address.landmark || "",
            reference_data: order.clientRefId
        };
    }
};

exports.searchLocation = async (query) => {
    try {
        const res = await client.get(`/api/partner/v2/get-partner-location-2-eloc/`, {
            params: { place_query: query },
            timeout: 10000
        });
        return res.data;
    } catch (error) {
        logger.error(`[Redcliffe] searchLocation error: ${error.message}`);
        throw error;
    }
};

exports.getLatLngFromEloc = async (eloc) => {
    try {
        const res = await client.get(`/api/partner/v2/get-partner-loc-2-eloc/`, {
            params: { eloc },
            timeout: 10000
        });
        return res.data;
    } catch (error) {
        logger.error(`[Redcliffe] getLatLngFromEloc error: ${error.message}`);
        throw error;
    }
};

exports.checkServiceability = async (lat, long) => {
    try {
        const res = await client.get(`/api/center/v2/is-location-serviceable/`, {
            params: { latitude: lat, longitude: long },
            timeout: 30000 // Increase timeout for serviceability check (slow on mobile)
        });
        return res.data;
    } catch (error) {
        logger.error(`[Redcliffe] Serviceability error: ${error.message}`);
        throw error;
    }
};

exports.fetchTimeSlots = async (date, lat, long) => {
    try {
        const res = await client.get(`/api/booking/v2/get-time-slot-list/`, {
            params: { collection_date: date, latitude: lat, longitude: long },
            timeout: 30000 // Increase timeout for slots API (slow on mobile)
        });

        if (res.data.status === 'success' && res.data.results) {
            // Map the nested format_12_hrs to our flat 'slot' string
            const mappedSlots = res.data.results.map((s) => ({
                slot_id: s.id,
                slot_time: `${s.format_12_hrs.start_time} - ${s.format_12_hrs.end_time}`
            }));
            return {
                status: 'success',
                data: mappedSlots
            };
        }
        return res.data;
    } catch (error) {
        // 400 is expected when location is not serviceable — don't log as error
        if (error.response?.status === 400) {
            return { status: 'failure', data: [], message: 'No slots available for this location' };
        }
        logger.error(`[Redcliffe] TimeSlot error: ${error.message}`);
        throw error;
    }
};

exports.getPackages = async (search = '') => {
    try {
        const response = await client.get(`/api/external/v2/center-package-data/`, {
            params: { search }
        });

        // If API returns success but empty data, and it's an empty search, provide fallbacks
        if (response.data.status === 'success' && (!response.data.data || response.data.data.length === 0) && !search) {
            return { status: 'success', data: getFallbackPackages() };
        }

        return response.data;
    } catch (error) {
        // Handle 400 "No package found" as a fallback trigger for empty search
        if (error.response?.status === 400 && !search) {
            logger.info('[Redcliffe] Using fallback packages due to empty partner account.');
            return { status: 'success', data: getFallbackPackages() };
        }
        logger.error(`[Redcliffe] getPackages error: ${error.message}`);
        throw error;
    }
};

const getFallbackPackages = () => [
    { code: "PL70", name: "Smart Full Body + HbA1c", cost: 1299, discounted_cost: 999, tests_count: 85, fasting: true },
    { code: "CAMP015", name: "HbA1C (Glycated Hemoglobin)", cost: 499, discounted_cost: 399, tests_count: 1, fasting: false },
    { code: "BC035", name: "HBA1C Test", cost: 449, discounted_cost: 349, tests_count: 1, fasting: false },
    { code: "CAMP180", name: "Aarogyam C", cost: 799, discounted_cost: 649, tests_count: 46, fasting: true },
    { code: "CAMP059", name: "Aarogyam 1.3", cost: 999, discounted_cost: 799, tests_count: 72, fasting: true }
];

exports.getPackageDetails = async (code) => {
    try {
        const response = await client.get(`/api/external/v2/package-parameter-data/`, {
            params: { code }
        });
        return response.data;
    } catch (error) {
        logger.error(`[Redcliffe] getPackageDetails error: ${error.message}`);
        throw error;
    }
};

exports.holdBooking = async (orderData, type = 'HOME') => {
    try {
        const payload = transformToRedcliffePayload(orderData, type);

        const endpoint = type === 'DROP_OFF'
            ? '/api/external/v2/dropoff-create-booking/'
            : '/api/external/v2/center-create-booking/';

        const res = await client.post(endpoint, payload);

        // Handle explicit lowercase 'success' or capitalized 'Success' based on docs
        const status = typeof res.data.status === 'string' ? res.data.status.toLowerCase() : '';
        if (status !== "success") {
            throw new Error(res.data.message || "Redcliffe hold format rejected");
        }

        return res.data;
    } catch (error) {
        const errMessage = error.response?.data?.message || error.message;
        logger.error(`[Redcliffe] holdBooking error: ${errMessage}`);
        throw new Error(errMessage);
    }
};

exports.confirmBooking = async (bookingId) => {
    try {
        const res = await client.post(`/api/external/v2/center-confirm-booking/`, {
            booking_id: String(bookingId),
            is_confirmed: "true"
        });

        const status = typeof res.data.status === 'string' ? res.data.status.toLowerCase() : '';
        if (status !== "success") {
            throw new Error(res.data.message || "Failed to confirm at partner end");
        }

        return res.data;
    } catch (error) {
        const errMessage = error.response?.data?.message || error.message;
        logger.error(`[Redcliffe] confirmBooking error: ${errMessage}`);
        throw new Error(errMessage);
    }
};

exports.getBookingStatus = async (params) => {
    try {
        const res = await client.get(`/api/external/v2/center-get-booking/`, {
            params,
            headers: { 'key': API_KEY }
        });
        return res.data;
    } catch (error) {
        // If Redcliffe says "No booking done yet", it means it's still in HOLD or not confirmed
        if (error.response?.status === 400 && error.response?.data?.message === 'No booking done yet') {
            return {
                status: 'success',
                data: [{
                    booking_id: bid,
                    booking_status: 'Payment Pending',
                    message: 'Waiting for payment confirmation'
                }]
            };
        }
        logger.error(`[Redcliffe] getBookingStatus error: ${error.message}`);
        throw error;
    }
};

exports.getDigitalReport = async (bookingId) => {
    try {
        const res = await client.get(`/api/external/v2/get-digital-report/${bookingId}/`);
        return res.data;
    } catch (error) {
        logger.error(`[Redcliffe] getDigitalReport error: ${error.message}`);
        throw error;
    }
};

exports.getConsolidatedReport = async (bookingId) => {
    try {
        const res = await client.get(`/api/external/v2/get-consolidated-report/${bookingId}/`);
        return res.data;
    } catch (error) {
        logger.error(`[Redcliffe] getConsolidatedReport error: ${error.message}`);
        throw error;
    }
};

module.exports = {
    searchLocation: exports.searchLocation,
    getLatLngFromEloc: exports.getLatLngFromEloc,
    checkServiceability: exports.checkServiceability,
    getTimeSlots: exports.fetchTimeSlots,
    getPackages: exports.getPackages,
    getPackageDetails: exports.getPackageDetails,
    holdBooking: exports.holdBooking,
    confirmBooking: exports.confirmBooking,
    getBookingStatus: exports.getBookingStatus,
    getDigitalReport: exports.getDigitalReport,
    getConsolidatedReport: exports.getConsolidatedReport
};
