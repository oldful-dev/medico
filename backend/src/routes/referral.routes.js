// Referral Routes
const router = require('express').Router();
const { authenticate, authenticateAdmin } = require('../middleware/auth');
const { authorize } = require('../middleware/rbac');
const { auditMiddleware } = require('../middleware/audit');
const ctrl = require('../controllers/referral.controller');

// ── App user ──
router.get('/me', authenticate, ctrl.getMyReferral);
router.get('/validate', authenticate, ctrl.validateCode);

module.exports = router;

// ── Admin (mounted separately at /api/admin/referrals) ──
const adminRouter = require('express').Router();
const ADMIN = authorize('SUPER_ADMIN', 'BILLING_EXECUTIVE');

adminRouter.get('/', authenticateAdmin, ADMIN, ctrl.listReferrals);
adminRouter.get('/stats', authenticateAdmin, ADMIN, ctrl.getReferralStats);
adminRouter.get('/config', authenticateAdmin, ADMIN, ctrl.getConfig);
adminRouter.put('/config', authenticateAdmin, ADMIN, auditMiddleware('ReferralConfig'), ctrl.updateConfig);

module.exports.adminRouter = adminRouter;
