// Banner Routes
const router = require('express').Router();
const { authenticateAdmin } = require('../middleware/auth');
const { auditMiddleware } = require('../middleware/audit');
const { authorize } = require('../middleware/rbac');
const ctrl = require('../controllers/banner.controller');

// Admin routes (must be before :id routes to avoid parameter shadowing)
// Same roles blockNonOperational granted (SUPER_ADMIN, CITY_ADMIN,
// OPERATIONS_EXECUTIVE, CARE_MANAGER), plus CONTENT_ADMIN — an isolated
// role scoped to banners/media only, added explicitly here rather than by
// widening the shared blockNonOperational helper (which also gates
// unrelated operational routes CONTENT_ADMIN must not reach).
const BANNER_ROLES = ['SUPER_ADMIN', 'CITY_ADMIN', 'OPERATIONS_EXECUTIVE', 'CARE_MANAGER', 'CONTENT_ADMIN'];

router.get('/',         authenticateAdmin, authorize(...BANNER_ROLES), ctrl.getAllBanners);
router.post('/',        authenticateAdmin, authorize(...BANNER_ROLES), auditMiddleware('Banner'), ctrl.createBanner);
router.post('/reorder', authenticateAdmin, authorize(...BANNER_ROLES), ctrl.reorderBanners);

// Public routes (App)
router.get('/home', ctrl.getHomeBanners);

// Param routes (after specific routes)
router.get('/:id',           ctrl.getBannerById);
router.put('/:id',           authenticateAdmin, authorize(...BANNER_ROLES), auditMiddleware('Banner'), ctrl.updateBanner);
router.patch('/:id/toggle',  authenticateAdmin, authorize(...BANNER_ROLES), ctrl.toggleBannerStatus);
router.delete('/:id',        authenticateAdmin, authorize(...BANNER_ROLES), auditMiddleware('Banner'), ctrl.deleteBanner);

module.exports = router;
