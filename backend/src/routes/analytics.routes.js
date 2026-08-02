const router = require('express').Router();
const { authenticateAdmin } = require('../middleware/auth');
const { authorize } = require('../middleware/rbac');
const ctrl = require('../controllers/analytics.controller');

router.use(authenticateAdmin);
router.use(authorize('SUPER_ADMIN', 'CITY_ADMIN', 'OPS_EXEC', 'CARE_MANAGER', 'BILLING_EXECUTIVE', 'SUPPORT_AGENT'));

router.get('/state-business', ctrl.getStateBusinessDetails);

module.exports = router;
