// Notification Routes
const router = require('express').Router();
const { authenticateAdmin, authenticateUser } = require('../middleware/auth');
const ctrl = require('../controllers/notification.controller');

// User-facing endpoints (authenticated app users)
router.get('/my', authenticateUser, ctrl.getMyNotifications);
router.put('/my/read-all', authenticateUser, ctrl.markAllNotificationsRead);
router.put('/my/:id/read', authenticateUser, ctrl.markNotificationRead);

// Admin-only routes below
router.use(authenticateAdmin);

router.get('/logs', ctrl.getNotificationLogs);
router.get('/templates', ctrl.getTemplates);
router.post('/templates', ctrl.createTemplate);
router.put('/templates/:id', ctrl.updateTemplate);
router.delete('/templates/:id', ctrl.deleteTemplate);
router.post('/send-campaign', ctrl.sendCampaign);
router.post('/test-push', ctrl.sendTestPush);

module.exports = router;
