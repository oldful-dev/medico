// App Message Routes — spec 6.2/6.3/6.4 "Wish & Information"
const router = require('express').Router();
const { authenticateAdmin, authenticateUser } = require('../middleware/auth');
const { blockNonManagement } = require('../middleware/rbac');
const { auditMiddleware } = require('../middleware/audit');
const ctrl = require('../controllers/appMessage.controller');

// Customer-facing: fetch the active popup (dismissal-aware) + record actions
router.get('/active',           authenticateUser, ctrl.getActiveMessage);
router.post('/:id/dismiss',     authenticateUser, ctrl.dismissMessage);
router.post('/:id/acknowledge', authenticateUser, ctrl.acknowledgeMessage);

// Admin-only routes
router.use(authenticateAdmin);
router.use(blockNonManagement);

router.get('/',                  ctrl.getAllMessages);
router.get('/:id/engagement',    ctrl.getMessageEngagement);
router.post('/',                 auditMiddleware('AppMessage'), ctrl.createMessage);
router.put('/:id',               auditMiddleware('AppMessage'), ctrl.updateMessage);
router.delete('/:id',            auditMiddleware('AppMessage'), ctrl.deleteMessage);

module.exports = router;
