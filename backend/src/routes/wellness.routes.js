const router = require('express').Router();
const { authenticateAdmin } = require('../middleware/auth');
const { authorize } = require('../middleware/rbac');
const ctrl = require('../controllers/wellness.controller');

// Same rationale as order.routes.js — these had no role gate at all.
const WELLNESS_ADMIN_ROLES = ['SUPER_ADMIN', 'OPERATIONS_EXECUTIVE', 'BILLING_EXECUTIVE'];

// Public / User Routes
router.get('/banners', ctrl.getWellnessBanners);
router.get('/status', ctrl.getWellnessStatus);
router.post('/shipping/rates', ctrl.getShippingRates);

// Admin Routes
// Was `authenticate` (any logged-in customer) with zero ownership check on
// `orderId` — any customer could overwrite any other order's awbCode/
// trackingUrl/shippingStatus. No mobile/web caller of this route exists
// (confirmed by grep), so it's tightened to admin-only rather than kept
// customer-facing with just an ownership check — a customer has no
// legitimate reason to create a shipment record themselves.
router.post('/shipping/create', authenticateAdmin, authorize(...WELLNESS_ADMIN_ROLES), ctrl.createShipment);
router.put('/status', authenticateAdmin, authorize(...WELLNESS_ADMIN_ROLES), ctrl.toggleWellnessStatus);

module.exports = router;
