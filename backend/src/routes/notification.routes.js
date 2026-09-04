// Notification Routes
const router = require('express').Router();
const { authenticateAdmin, authenticateUser } = require('../middleware/auth');
const { blockNonManagement } = require('../middleware/rbac');
const ctrl = require('../controllers/notification.controller');

// User-facing endpoints
router.get('/my',           authenticateUser, ctrl.getMyNotifications);
router.put('/my/read-all',  authenticateUser, ctrl.markAllNotificationsRead);
router.put('/my/:id/read',  authenticateUser, ctrl.markNotificationRead);

// Admin-only routes (SUPER_ADMIN, CITY_ADMIN, OPERATIONS_EXECUTIVE only)
router.use(authenticateAdmin);
router.use(blockNonManagement);

router.get('/logs',             ctrl.getNotificationLogs);
router.post('/send-campaign',   ctrl.sendCampaign);
router.post('/test-push',       ctrl.sendTestPush);

module.exports = router;
