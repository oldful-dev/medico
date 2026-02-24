// City Routes
const router = require('express').Router();
const { authenticateAdmin } = require('../middleware/auth');
const { authorize } = require('../middleware/rbac');
const { auditMiddleware } = require('../middleware/audit');
const ctrl = require('../controllers/city.controller');

router.get('/', ctrl.getCities);  // Public for app
router.get('/:id', ctrl.getCityById);

// Admin-only routes
router.post('/', authenticateAdmin, authorize('SUPER_ADMIN'), auditMiddleware('City'), ctrl.createCity);
router.put('/:id', authenticateAdmin, authorize('SUPER_ADMIN', 'CITY_ADMIN'), auditMiddleware('City'), ctrl.updateCity);
router.delete('/:id', authenticateAdmin, authorize('SUPER_ADMIN'), auditMiddleware('City'), ctrl.deleteCity);
router.get('/:id/revenue', authenticateAdmin, ctrl.getCityRevenue);

module.exports = router;
