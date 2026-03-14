// ──────────────────────────────────────────────
//  Redcliffe Labs API Service
// ──────────────────────────────────────────────

const axios = require('axios');
const { logger } = require('../config/logger');

const REDCLIFFE_BASE_URL = process.env.REDCLIFFE_API_URL || 'https://api.redcliffelabs.com/v1';
const REDCLIFFE_API_KEY = process.env.REDCLIFFE_API_KEY;

/**
 * Book a Lab Test Slot
 * @param {Object} data - patientName, patientPhone, testIds, scheduledDate, addressLine
 */
const bookLabTestSlot = async (data) => {
    try {
        if (!REDCLIFFE_API_KEY) {
            logger.warn('Redcliffe API Key missing. Skipping real integration.');
            return {
                redcliffe_order_id: `SIM_${Date.now()}`,
                status: 'booked',
                message: 'Redcliffe simulation mode active.'
            };
        }

        const response = await axios.post(`${REDCLIFFE_BASE_URL}/bookings`, {
            patient_name: data.patientName,
            patient_mobile: data.patientPhone,
            tests: data.testIds,
            appointment_date: data.scheduledDate,
            address: data.addressLine,
        }, {
            headers: { 'Authorization': `Bearer ${REDCLIFFE_API_KEY}` }
        });

        return response.data;
    } catch (error) {
        logger.error('Redcliffe Booking Error:', error.response?.data || error.message);
        throw new Error('Failed to book lab test with Redcliffe Labs');
    }
};

/**
 * Fetch Lab Report Link
 */
const getLabReport = async (orderId) => {
    try {
        const response = await axios.get(`${REDCLIFFE_BASE_URL}/reports/${orderId}`, {
            headers: { 'Authorization': `Bearer ${REDCLIFFE_API_KEY}` }
        });
        return response.data; // Should return { report_url: "..." }
    } catch (error) {
        logger.error('Redcliffe Report Fetch Error:', error.response?.data || error.message);
        return null;
    }
};

module.exports = {
    bookLabTestSlot,
    getLabReport,
};
