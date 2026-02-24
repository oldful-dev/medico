// SOS Routes
const router = require('express').Router();
const { authenticate, authenticateAdmin, authenticateUser } = require('../middleware/auth');
const { cityRestriction } = require('../middleware/rbac');
const ctrl = require('../controllers/sos.controller');

// App User
router.post('/', authenticateUser, ctrl.createSOSAlert);

// Admin
router.get('/', authenticateAdmin, cityRestriction, ctrl.getSOSAlerts);
router.put('/:id/assign', authenticateAdmin, ctrl.assignResponder);
router.put('/:id/resolve', authenticateAdmin, ctrl.resolveSOSAlert);
router.put('/:id/notify', authenticateAdmin, ctrl.updateNotificationStatus);

module.exports = router;
