// App Config Routes — SDUI (Server-Driven UI)
const router = require('express').Router();
const { authenticateAdmin } = require('../middleware/auth');
const { authorize } = require('../middleware/rbac');
const ctrl = require('../controllers/appConfig.controller');

// Public — mobile app fetches on startup (no auth)
router.get('/', ctrl.getAppConfig);

// Admin only
router.put('/',       authenticateAdmin, authorize('SUPER_ADMIN'), ctrl.updateAppConfig);
router.post('/reset', authenticateAdmin, authorize('SUPER_ADMIN'), ctrl.resetAppConfig);
router.get('/default',authenticateAdmin, authorize('SUPER_ADMIN'), ctrl.getDefaultConfig);

module.exports = router;
