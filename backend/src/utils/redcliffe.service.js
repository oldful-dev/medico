// ──────────────────────────────────────────────
//  Redcliffe Labs API Integration Service
// ──────────────────────────────────────────────

const { logger } = require('../config/logger');

// Placeholder Base URL - Replace with actual Redcliffe API endpoint
const REDCLIFFE_API_BASE_URL = process.env.REDCLIFFE_API_BASE_URL || 'https://api.redcliffelabs.com/v1';
const REDCLIFFE_API_KEY = process.env.REDCLIFFE_API_KEY || 'mock_key_for_dev';

/**
 * Fetch available lab tests from Redcliffe Labs
 */
const fetchAvailableTests = async (cityCode) => {
    try {
        // Mock Implementation for development
        if (REDCLIFFE_API_KEY === 'mock_key_for_dev') {
            logger.info(`Simulating fetching Redcliffe tests for city: ${cityCode}`);
            return [
                { id: 'RC-001', name: 'Full Body Checkup', price: 999, requiresFasting: true },
                { id: 'RC-002', name: 'Diabetes Profile', price: 499, requiresFasting: true },
                { id: 'RC-003', name: 'Thyroid Profile', price: 399, requiresFasting: false },
                { id: 'RC-004', name: 'Vitamin D & B12', price: 899, requiresFasting: false }
            ];
        }

        const response = await fetch(`${REDCLIFFE_API_BASE_URL}/tests?city=${cityCode}`, {
            headers: { 'Authorization': `Bearer ${REDCLIFFE_API_KEY}` }
        });

        if (!response.ok) throw new Error(`Redcliffe API Error: ${response.status}`);
        return await response.json();
    } catch (error) {
        logger.error('Failed to fetch Redcliffe tests:', error);
        throw error;
    }
};

/**
 * Book a home sample collection slot
 */
const bookLabTestSlot = async (bookingDetails) => {
    try {
        // Mock Implementation
        if (REDCLIFFE_API_KEY === 'mock_key_for_dev') {
            logger.info(`Simulating Redcliffe test booking for user: ${bookingDetails.patientName}`);
            return {
                success: true,
                orderId: `RC-ORD-${Date.now()}`,
                status: 'CONFIRMED',
                message: 'Slot booked successfully via Dev Mock'
            };
        }

        const response = await fetch(`${REDCLIFFE_API_BASE_URL}/book-slot`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${REDCLIFFE_API_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(bookingDetails)
        });

        if (!response.ok) throw new Error(`Redcliffe API Error: ${response.status}`);
        return await response.json();
    } catch (error) {
        logger.error('Failed to book Redcliffe slot:', error);
        throw error;
    }
};

module.exports = {
    fetchAvailableTests,
    bookLabTestSlot
};
