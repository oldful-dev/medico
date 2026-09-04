// App Config Routes — SDUI (Server-Driven UI)
const router = require('express').Router();
const { authenticateAdmin } = require('../middleware/auth');
const { authorize } = require('../middleware/rbac');
const ctrl = require('../controllers/appConfig.controller');

// Public — mobile app fetches on startup (no auth)
router.get('/', ctrl.getAppConfig);
router.get('/home', ctrl.getHomeConfig);

// Admin only
router.put('/',       authenticateAdmin, authorize('SUPER_ADMIN'), ctrl.updateAppConfig);
router.post('/reset', authenticateAdmin, authorize('SUPER_ADMIN'), ctrl.resetAppConfig);
router.get('/default',authenticateAdmin, authorize('SUPER_ADMIN'), ctrl.getDefaultConfig);

router.put('/home',       authenticateAdmin, authorize('SUPER_ADMIN'), ctrl.updateHomeConfig);
router.post('/home/reset', authenticateAdmin, authorize('SUPER_ADMIN'), ctrl.resetHomeConfig);

// Draft — unpublished WIP, never reachable by the public /home route above.
// GET also doubles as the "preview as live" admin-only staging view (draft
// falls back to the live config if none is saved yet).
router.get('/home/draft', authenticateAdmin, authorize('SUPER_ADMIN'), ctrl.getHomeConfigDraft);
router.put('/home/draft', authenticateAdmin, authorize('SUPER_ADMIN'), ctrl.updateHomeConfigDraft);

router.get('/:configKey/history',            authenticateAdmin, authorize('SUPER_ADMIN'), ctrl.getConfigHistory);
router.post('/:configKey/rollback/:versionId', authenticateAdmin, authorize('SUPER_ADMIN'), ctrl.rollbackConfig);

module.exports = router;
