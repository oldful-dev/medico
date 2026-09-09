// Coupon / Promotions Routes (admin only)
const router = require('express').Router();
const { authenticateAdmin } = require('../middleware/auth');
const { authorize } = require('../middleware/rbac');
const { auditMiddleware } = require('../middleware/audit');
const ctrl = require('../controllers/coupon.controller');

const ADMIN = authorize('SUPER_ADMIN', 'BILLING_EXECUTIVE');

router.get('/', authenticateAdmin, ADMIN, ctrl.listCoupons);
router.get('/:id', authenticateAdmin, ADMIN, ctrl.getCoupon);
router.post('/', authenticateAdmin, ADMIN, auditMiddleware('Coupon'), ctrl.createCoupon);
router.put('/:id', authenticateAdmin, ADMIN, auditMiddleware('Coupon'), ctrl.updateCoupon);
router.delete('/:id', authenticateAdmin, ADMIN, auditMiddleware('Coupon'), ctrl.deleteCoupon);

module.exports = router;
