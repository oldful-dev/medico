// Service Charge Routes
const router = require('express').Router();
const { authenticateAdmin } = require('../middleware/auth');
const { authorize } = require('../middleware/rbac');
const { auditMiddleware } = require('../middleware/audit');
const ctrl = require('../controllers/serviceCharge.controller');

// All service charge CRUD operations are admin-only
router.use(authenticateAdmin);

router.get('/', ctrl.getServiceCharges);
router.get('/:id', ctrl.getServiceChargeById);
router.post('/', authorize('SUPER_ADMIN'), auditMiddleware('ServiceCharge'), ctrl.createServiceCharge);
router.put('/:id', authorize('SUPER_ADMIN', 'CITY_ADMIN'), auditMiddleware('ServiceCharge'), ctrl.updateServiceCharge);
router.delete('/:id', authorize('SUPER_ADMIN'), auditMiddleware('ServiceCharge'), ctrl.deleteServiceCharge);

module.exports = router;
