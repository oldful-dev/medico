// Notification Routes
const router = require('express').Router();
const { authenticateAdmin, authenticateUser } = require('../middleware/auth');
const ctrl = require('../controllers/notification.controller');

// User-facing endpoint (authenticated app users)
router.get('/my', authenticateUser, ctrl.getMyNotifications);

// Admin-only routes below
router.use(authenticateAdmin);

router.get('/logs', ctrl.getNotificationLogs);
router.get('/templates', ctrl.getTemplates);
router.post('/templates', ctrl.createTemplate);
router.put('/templates/:id', ctrl.updateTemplate);
router.delete('/templates/:id', ctrl.deleteTemplate);
router.post('/send-campaign', ctrl.sendCampaign);

module.exports = router;
