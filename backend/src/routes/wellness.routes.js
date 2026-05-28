const router = require('express').Router();
const { authenticate, authenticateAdmin } = require('../middleware/auth');
const ctrl = require('../controllers/wellness.controller');

// Public / User Routes
router.get('/banners', ctrl.getWellnessBanners);
router.get('/status', ctrl.getWellnessStatus);
router.post('/shipping/rates', ctrl.getShippingRates);
router.post('/shipping/create', authenticate, ctrl.createShipment);

// Admin Routes
router.put('/status', authenticateAdmin, ctrl.toggleWellnessStatus);

module.exports = router;
