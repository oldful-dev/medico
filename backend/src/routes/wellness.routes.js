const router = require('express').Router();
const { authenticateAdmin } = require('../middleware/auth');
const ctrl = require('../controllers/wellness.controller');

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
router.post('/shipping/create', authenticateAdmin, ctrl.createShipment);
router.put('/status', authenticateAdmin, ctrl.toggleWellnessStatus);

module.exports = router;
