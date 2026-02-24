// Payment Routes
const router = require('express').Router();
const { authenticate, authenticateAdmin } = require('../middleware/auth');
const ctrl = require('../controllers/payment.controller');

// App User routes
router.get('/methods', ctrl.getPaymentMethods);
router.post('/initiate', authenticate, ctrl.initiatePayment);
router.post('/verify', authenticate, ctrl.verifyPayment);
router.post('/apply-coupon', authenticate, ctrl.applyCoupon);

// Admin routes
router.get('/', authenticateAdmin, ctrl.getPayments);
router.post('/refund', authenticateAdmin, ctrl.initiateRefund);
router.get('/:id/refund-status', authenticateAdmin, ctrl.getRefundStatus);

module.exports = router;
