const router = require('express').Router();
const { authenticate } = require('../middleware/auth');
const ctrl = require('../controllers/checkout.controller');

// GET /api/pricing/service-charge/:category
// Pre-checkout price preview (e.g. Tech Helper's online/offline fee display) —
// resolves the same ServiceCharge config calculateCheckout will actually use.
router.get('/service-charge/:category', authenticate, ctrl.getServiceChargeForCategory);

module.exports = router;
