// ──────────────────────────────────────────────
//  Redcliffe Labs API Service
//  Full partner API integration (v2)
// ──────────────────────────────────────────────

const axios = require('axios');
const { logger } = require('../config/logger');

const REDCLIFFE_BASE_URL = process.env.REDCLIFFE_API_BASE_URL || 'https://api.redcliffelabs.com';
const REDCLIFFE_API_KEY  = process.env.REDCLIFFE_API_KEY;

// ─── Auth Headers ─────────────────────────────
const authHeaders = () => {
    if (!REDCLIFFE_API_KEY || REDCLIFFE_API_KEY === 'your_redcliffe_api_key') {
        throw new Error('REDCLIFFE_API_KEY is not configured. Set it in .env before using lab features.');
    }
    return { Authorization: `Bearer ${REDCLIFFE_API_KEY}` };
};

// ─── Location APIs ────────────────────────────

/**
 * Step 1 of location flow: search text → elocID list
 * GET /api/partner/v2/get-partner-location-2-eloc/?place_query=
 */
const searchLocation = async (place_query) => {
    try {
        const response = await axios.get(
            `${REDCLIFFE_BASE_URL}/api/partner/v2/get-partner-location-2-eloc/`,
            { params: { place_query }, headers: authHeaders() }
        );
        return response.data;
    } catch (error) {
        logger.error('Redcliffe searchLocation error:', error.response?.data || error.message);
        throw error;
    }
};

/**
 * Step 2 of location flow: elocID → lat/long
 * GET /api/partner/v2/get-partner-loc-2-eloc/?eloc=
 */
const getLatLngFromEloc = async (eloc) => {
    try {
        const response = await axios.get(
            `${REDCLIFFE_BASE_URL}/api/partner/v2/get-partner-loc-2-eloc/`,
            { params: { eloc }, headers: authHeaders() }
        );
        return response.data;
    } catch (error) {
        logger.error('Redcliffe getLatLngFromEloc error:', error.response?.data || error.message);
        throw error;
    }
};

// ─── Time Slot API ────────────────────────────

/**
 * GET /api/booking/v2/get-time-slot-list/
 * @param {string} collection_date  YYYY-MM-DD (current date or up to 4 days ahead)
 * @param {number} latitude
 * @param {number} longitude
 * @param {string} [customer_gender]  required only when is_ecg=true
 */
const getTimeSlots = async (collection_date, latitude, longitude, customer_gender) => {
    try {
        const params = { collection_date, latitude, longitude };
        if (customer_gender) params.customer_gender = customer_gender;
        const response = await axios.get(
            `${REDCLIFFE_BASE_URL}/api/booking/v2/get-time-slot-list/`,
            { params, headers: authHeaders() }
        );
        return response.data;
    } catch (error) {
        logger.error('Redcliffe getTimeSlots error:', error.response?.data || error.message);
        throw error;
    }
};

// ─── Package APIs ─────────────────────────────

/**
 * GET /api/external/v2/center-package-data/?search=
 * Returns paginated list of packages mapped to the partner account.
 */
const getPackages = async (search = '') => {
    try {
        const response = await axios.get(
            `${REDCLIFFE_BASE_URL}/api/external/v2/center-package-data/`,
            { params: { search }, headers: authHeaders() }
        );
        return response.data;
    } catch (error) {
        logger.error('Redcliffe getPackages error:', error.response?.data || error.message);
        throw error;
    }
};

/**
 * GET /api/external/v2/package-parameter-data/?code=
 * Returns test parameters included in a specific package.
 */
const getPackageDetails = async (code) => {
    try {
        const response = await axios.get(
            `${REDCLIFFE_BASE_URL}/api/external/v2/package-parameter-data/`,
            { params: { code }, headers: authHeaders() }
        );
        return response.data;
    } catch (error) {
        logger.error('Redcliffe getPackageDetails error:', error.response?.data || error.message);
        throw error;
    }
};

// ─── Booking APIs ─────────────────────────────

/**
 * Step 1 of booking flow: creates a temporary booking (30-min lock).
 * POST /api/external/v2/center-create-booking/
 * Must be followed by confirmBooking() to make it permanent.
 */
const createTempBooking = async (data) => {
    try {
        const response = await axios.post(
            `${REDCLIFFE_BASE_URL}/api/external/v2/center-create-booking/`,
            data,
            { headers: authHeaders() }
        );
        return response.data;
    } catch (error) {
        logger.error('Redcliffe createTempBooking error:', error.response?.data || error.message);
        throw error;
    }
};

/**
 * Step 2 of booking flow: confirms or cancels a temporary booking.
 * POST /api/external/v2/center-confirm-booking/
 * @param {number} booking_id  the booking_id returned by createTempBooking
 * @param {boolean} is_confirmed  true = confirm, false = cancel
 */
const confirmBooking = async (booking_id, is_confirmed) => {
    try {
        const response = await axios.post(
            `${REDCLIFFE_BASE_URL}/api/external/v2/center-confirm-booking/`,
            { booking_id, is_confirmed },
            { headers: authHeaders() }
        );
        return response.data;
    } catch (error) {
        logger.error('Redcliffe confirmBooking error:', error.response?.data || error.message);
        throw error;
    }
};

/**
 * Reschedule or cancel an existing permanent booking.
 * POST /api/external/v2/center-update-booking/
 * @param {Object} data  { booking_id, booking_status, remark, collection_date?, collection_slot? }
 */
const updateBooking = async (data) => {
    try {
        const response = await axios.post(
            `${REDCLIFFE_BASE_URL}/api/external/v2/center-update-booking/`,
            data,
            { headers: authHeaders() }
        );
        return response.data;
    } catch (error) {
        logger.error('Redcliffe updateBooking error:', error.response?.data || error.message);
        throw error;
    }
};

/**
 * Add additional members to an existing permanent booking (before phlebo assigned).
 * POST /api/external/v2/open-add-member/{booking_id}
 */
const addMember = async (booking_id, additional_member) => {
    try {
        const response = await axios.post(
            `${REDCLIFFE_BASE_URL}/api/external/v2/open-add-member/${booking_id}`,
            { additional_member },
            { headers: authHeaders() }
        );
        return response.data;
    } catch (error) {
        logger.error('Redcliffe addMember error:', error.response?.data || error.message);
        throw error;
    }
};

/**
 * Update payment mode (credit/COD) on an existing booking (before phlebo assigned).
 * POST /api/external/v2/center-update-is-credit/
 */
const updatePaymentMode = async (booking_id, is_credit, remark) => {
    try {
        const response = await axios.post(
            `${REDCLIFFE_BASE_URL}/api/external/v2/center-update-is-credit/`,
            { booking_id, is_credit, remark },
            { headers: authHeaders() }
        );
        return response.data;
    } catch (error) {
        logger.error('Redcliffe updatePaymentMode error:', error.response?.data || error.message);
        throw error;
    }
};

/**
 * Update package codes on an existing booking (before phlebo assigned).
 * POST /api/external/v2/open-set-package/{booking_id}/
 */
const updatePackage = async (booking_id, packages, center_discount = 0) => {
    try {
        const response = await axios.post(
            `${REDCLIFFE_BASE_URL}/api/external/v2/open-set-package/${booking_id}/`,
            { packages, center_discount },
            { headers: authHeaders() }
        );
        return response.data;
    } catch (error) {
        logger.error('Redcliffe updatePackage error:', error.response?.data || error.message);
        throw error;
    }
};

// ─── Status & Reports ─────────────────────────

/**
 * Fetch confirmed booking details and latest status.
 * GET /api/external/v2/center-get-booking?{param}={value}
 * @param {Object} params  e.g. { booking_id: 123 } or { mobile: '9999999999' }
 */
const getBookingStatus = async (params) => {
    try {
        const response = await axios.get(
            `${REDCLIFFE_BASE_URL}/api/external/v2/center-get-booking`,
            { params, headers: authHeaders() }
        );
        return response.data;
    } catch (error) {
        logger.error('Redcliffe getBookingStatus error:', error.response?.data || error.message);
        throw error;
    }
};

/**
 * Retrieve digital (JSON) test result values for a booking.
 * GET /api/external/v2/get-digital-report/{bookingId}
 */
const getDigitalReport = async (bookingId) => {
    try {
        const response = await axios.get(
            `${REDCLIFFE_BASE_URL}/api/external/v2/get-digital-report/${bookingId}`,
            { headers: authHeaders() }
        );
        return response.data;
    } catch (error) {
        logger.error('Redcliffe getDigitalReport error:', error.response?.data || error.message);
        throw error;
    }
};

/**
 * Retrieve the consolidated PDF report for a booking.
 * GET /api/external/v2/get-consolidated-report/{bookingId}
 */
const getConsolidatedReport = async (bookingId) => {
    try {
        const response = await axios.get(
            `${REDCLIFFE_BASE_URL}/api/external/v2/get-consolidated-report/${bookingId}`,
            { headers: authHeaders() }
        );
        return response.data;
    } catch (error) {
        logger.error('Redcliffe getConsolidatedReport error:', error.response?.data || error.message);
        throw error;
    }
};

module.exports = {
    searchLocation,
    getLatLngFromEloc,
    getTimeSlots,
    getPackages,
    getPackageDetails,
    createTempBooking,
    confirmBooking,
    updateBooking,
    addMember,
    updatePaymentMode,
    updatePackage,
    getBookingStatus,
    getDigitalReport,
    getConsolidatedReport,
};
