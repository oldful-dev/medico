// Audit Log Routes
const router = require('express').Router();
const { authenticateAdmin } = require('../middleware/auth');
const { authorize } = require('../middleware/rbac');
const ctrl = require('../controllers/audit.controller');

router.use(authenticateAdmin);
router.use(authorize('SUPER_ADMIN', 'CITY_ADMIN'));

router.get('/', ctrl.getAuditLogs);
router.get('/:id', ctrl.getAuditLogById);

module.exports = router;
