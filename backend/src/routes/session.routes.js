const router = require('express').Router();
const { authenticateAdmin } = require('../middleware/auth');
const { authorize } = require('../middleware/rbac');
const ctrl = require('../controllers/session.controller');

// All routes require Super Admin authorization
router.use(authenticateAdmin);
router.use(authorize('SUPER_ADMIN'));

router.get('/active', ctrl.getActiveSessions);
router.delete('/:id', ctrl.terminateSession);

module.exports = router;
