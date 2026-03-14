// ──────────────────────────────────────────────
//  Razorpay Payment Service
// ──────────────────────────────────────────────

const Razorpay = require('razorpay');
const crypto = require('crypto');
const { logger } = require('../config/logger');

const razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET,
});

/**
 * Create a Razorpay Order
 * @param {number} amount - Amount in INR (will be converted to paise)
 * @param {string} receipt - Unique receipt ID
 */
const createOrder = async (amount, receipt) => {
    try {
        const options = {
            amount: Math.round(amount * 100), // convert to paise
            currency: 'INR',
            receipt: receipt,
        };
        const order = await razorpay.orders.create(options);
        return order;
    } catch (error) {
        logger.error('Razorpay Order Creation Error:', error);
        throw error;
    }
};

/**
 * Verify Razorpay Signature
 */
const verifySignature = (orderId, paymentId, signature) => {
    const text = `${orderId}|${paymentId}`;
    const expectedSignature = crypto
        .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
        .update(text)
        .digest('hex');
    
    return expectedSignature === signature;
};

module.exports = {
    createOrder,
    verifySignature,
    razorpay,
};
