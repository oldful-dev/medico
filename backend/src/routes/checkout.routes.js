const router = require('express').Router();
const { authenticate } = require('../middleware/auth');
const ctrl = require('../controllers/checkout.controller');

// User routes
router.post('/calculate', authenticate, ctrl.calculateCheckout);
router.post('/calculate-membership-savings', authenticate, ctrl.calculateMembershipSavings);

module.exports = router;
