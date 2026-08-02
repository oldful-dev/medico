// Banner Routes
const router = require('express').Router();
const { authenticateAdmin } = require('../middleware/auth');
const { auditMiddleware } = require('../middleware/audit');
const { blockNonOperational } = require('../middleware/rbac');
const ctrl = require('../controllers/banner.controller');

// Admin routes (must be before :id routes to avoid parameter shadowing)
// SUPER_ADMIN, CITY_ADMIN, OPERATIONS_EXECUTIVE, CARE_MANAGER only
router.get('/',         authenticateAdmin, blockNonOperational, ctrl.getAllBanners);
router.post('/',        authenticateAdmin, blockNonOperational, auditMiddleware('Banner'), ctrl.createBanner);
router.post('/reorder', authenticateAdmin, blockNonOperational, ctrl.reorderBanners);

// Public routes (App)
router.get('/home', ctrl.getHomeBanners);

// Param routes (after specific routes)
router.get('/:id',           ctrl.getBannerById);
router.put('/:id',           authenticateAdmin, blockNonOperational, auditMiddleware('Banner'), ctrl.updateBanner);
router.patch('/:id/toggle',  authenticateAdmin, blockNonOperational, ctrl.toggleBannerStatus);
router.delete('/:id',        authenticateAdmin, blockNonOperational, auditMiddleware('Banner'), ctrl.deleteBanner);

module.exports = router;
