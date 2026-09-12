// Service Category Routes — generic category CRUD shared across admin
// modules (Home Essentials, Diagnostic & Fitness, Tours & Travel). See
// serviceCategory.controller.js and the ServiceCategory model.
const router = require('express').Router();
const { authenticateAdmin } = require('../middleware/auth');
const { blockNonOperational } = require('../middleware/rbac');
const ctrl = require('../controllers/serviceCategory.controller');

router.get('/', ctrl.getServiceCategories);
router.post('/', authenticateAdmin, blockNonOperational, ctrl.createServiceCategory);
router.put('/reorder', authenticateAdmin, blockNonOperational, ctrl.reorderServiceCategories);
router.put('/:id', authenticateAdmin, blockNonOperational, ctrl.updateServiceCategory);
router.put('/:id/toggle', authenticateAdmin, blockNonOperational, ctrl.toggleServiceCategory);
router.delete('/:id', authenticateAdmin, blockNonOperational, ctrl.deleteServiceCategory);

module.exports = router;
