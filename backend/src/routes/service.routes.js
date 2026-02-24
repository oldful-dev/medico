// Service Routes
const router = require('express').Router();
const { authenticateAdmin } = require('../middleware/auth');
const { auditMiddleware } = require('../middleware/audit');
const upload = require('../middleware/upload');
const ctrl = require('../controllers/service.controller');

// Public routes (App)
router.get('/', ctrl.getServices);
router.get('/:id', ctrl.getServiceById);

// Admin routes
router.post('/', authenticateAdmin, auditMiddleware('Service'), ctrl.createService);
router.put('/reorder', authenticateAdmin, ctrl.reorderServices);
router.put('/:id', authenticateAdmin, auditMiddleware('Service'), ctrl.updateService);
router.put('/:id/toggle', authenticateAdmin, ctrl.toggleService);
router.post('/:id/hero-image', authenticateAdmin, upload.single('image'), ctrl.uploadHeroImage);
router.delete('/:id', authenticateAdmin, auditMiddleware('Service'), ctrl.deleteService);

module.exports = router;
