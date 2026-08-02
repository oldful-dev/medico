// Payment Routes
const router = require('express').Router();
const { authenticate, authenticateAdmin } = require('../middleware/auth');
const { blockPaymentModulesForNonBilling } = require('../middleware/rbac');
const ctrl = require('../controllers/payment.controller');

// App User routes
router.get('/methods', ctrl.getPaymentMethods);
router.get('/saved-cards', authenticate, ctrl.getSavedCards);
router.post('/saved-cards', authenticate, ctrl.addSavedCard);
router.delete('/saved-cards/:id', authenticate, ctrl.deleteSavedCard);
router.put('/saved-cards/:id/set-default', authenticate, ctrl.setDefaultCard);
router.post('/initiate', authenticate, ctrl.initiatePayment);
router.post('/verify', authenticate, ctrl.verifyPayment);
router.post('/cancel', authenticate, ctrl.cancelPayment);   // Called on dismiss / failure
router.post('/apply-coupon', authenticate, ctrl.applyCoupon);

// Admin routes (restricted to Super Admin & Billing Executive)
router.get('/', authenticateAdmin, blockPaymentModulesForNonBilling, ctrl.getPayments);
router.post('/refund', authenticateAdmin, blockPaymentModulesForNonBilling, ctrl.initiateRefund);
router.get('/:id/refund-status', authenticateAdmin, blockPaymentModulesForNonBilling, ctrl.getRefundStatus);
router.put('/:id/status', authenticateAdmin, blockPaymentModulesForNonBilling, ctrl.updatePaymentStatus);
router.post('/manual-success', authenticateAdmin, blockPaymentModulesForNonBilling, ctrl.manualPaymentSuccess);

module.exports = router;
