// Service Routes
const router = require('express').Router();
const { authenticateAdmin } = require('../middleware/auth');
const { auditMiddleware } = require('../middleware/audit');
const { blockNonOperational } = require('../middleware/rbac');
const upload = require('../middleware/upload');
const ctrl = require('../controllers/service.controller');

// Public routes (App)
router.get('/', ctrl.getServices);
router.get('/:id', ctrl.getServiceById);

// Admin routes (SUPER_ADMIN, CITY_ADMIN, OPERATIONS_EXECUTIVE, CARE_MANAGER only)
router.post('/',           authenticateAdmin, blockNonOperational, auditMiddleware('Service'), ctrl.createService);
router.put('/reorder',     authenticateAdmin, blockNonOperational, ctrl.reorderServices);
router.put('/:id',         authenticateAdmin, blockNonOperational, auditMiddleware('Service'), ctrl.updateService);
router.put('/:id/toggle',  authenticateAdmin, blockNonOperational, ctrl.toggleService);
router.post('/:id/hero-image', authenticateAdmin, blockNonOperational, upload.single('image'), ctrl.uploadHeroImage);
router.delete('/:id',      authenticateAdmin, blockNonOperational, auditMiddleware('Service'), ctrl.deleteService);

module.exports = router;
