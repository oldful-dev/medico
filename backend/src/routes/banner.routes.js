// Banner Routes
const router = require('express').Router();
const { authenticateAdmin } = require('../middleware/auth');
const { auditMiddleware } = require('../middleware/audit');
const ctrl = require('../controllers/banner.controller');

// Admin routes (must be before :id routes to avoid parameter shadowing)
router.get('/', authenticateAdmin, ctrl.getAllBanners);
router.post('/', authenticateAdmin, auditMiddleware('Banner'), ctrl.createBanner);
router.post('/reorder', authenticateAdmin, ctrl.reorderBanners);

// Public routes (App)
router.get('/home', ctrl.getHomeBanners);

// Param routes (after specific routes)
router.get('/:id', ctrl.getBannerById);
router.put('/:id', authenticateAdmin, auditMiddleware('Banner'), ctrl.updateBanner);
router.patch('/:id/toggle', authenticateAdmin, ctrl.toggleBannerStatus);
router.delete('/:id', authenticateAdmin, auditMiddleware('Banner'), ctrl.deleteBanner);

module.exports = router;
