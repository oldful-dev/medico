// Subscription Routes
const router = require('express').Router();
const { authenticateAdmin } = require('../middleware/auth');
const { auditMiddleware } = require('../middleware/audit');
const ctrl = require('../controllers/subscription.controller');

router.use(authenticateAdmin);

router.get('/', ctrl.getSubscriptions);
router.post('/', auditMiddleware('Subscription'), ctrl.createSubscription);
router.put('/:id/pause', auditMiddleware('Subscription'), ctrl.pauseSubscription);
router.put('/:id/resume', auditMiddleware('Subscription'), ctrl.resumeSubscription);
router.put('/:id/extend', auditMiddleware('Subscription'), ctrl.extendSubscription);
router.put('/:id/cancel', auditMiddleware('Subscription'), ctrl.cancelSubscription);
router.put('/:id/auto-renew', ctrl.toggleAutoRenew);
router.put('/:id/compassionate', auditMiddleware('Subscription'), ctrl.compassionateExtension);

module.exports = router;
