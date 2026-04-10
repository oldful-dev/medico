// Firebase Remote Config Routes (SDUI Admin Management)
const router = require('express').Router();
const { authenticateAdmin } = require('../middleware/auth');
const { authorize } = require('../middleware/rbac');
const ctrl = require('../controllers/remoteConfig.controller');

// All routes require admin auth (SUPER_ADMIN or CITY_ADMIN)
router.get('/template', authenticateAdmin, authorize('SUPER_ADMIN', 'CITY_ADMIN'), ctrl.getTemplate);
router.put('/parameters', authenticateAdmin, authorize('SUPER_ADMIN'), ctrl.updateParameters);
router.put('/parameter/:key', authenticateAdmin, authorize('SUPER_ADMIN', 'CITY_ADMIN'), ctrl.updateSingleParameter);
router.delete('/parameter/:key', authenticateAdmin, authorize('SUPER_ADMIN'), ctrl.deleteParameter);

module.exports = router;
