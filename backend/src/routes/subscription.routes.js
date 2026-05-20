// Subscription Routes
const router = require('express').Router();
const { authenticate, authenticateAdmin } = require('../middleware/auth');
const { auditMiddleware } = require('../middleware/audit');
const ctrl = require('../controllers/subscription.controller');

// User routes
router.get('/me/active', authenticate, ctrl.checkUserActiveSubscription);
router.post('/initiate', authenticate, ctrl.initiateUserSubscription);
router.post('/verify', authenticate, ctrl.verifyUserSubscription);

// Admin routes
router.get('/', authenticateAdmin, ctrl.getSubscriptions);
router.post('/', authenticateAdmin, auditMiddleware('Subscription'), ctrl.createSubscription);
router.put('/:id/pause', authenticateAdmin, auditMiddleware('Subscription'), ctrl.pauseSubscription);
router.put('/:id/resume', authenticateAdmin, auditMiddleware('Subscription'), ctrl.resumeSubscription);
router.put('/:id/extend', authenticateAdmin, auditMiddleware('Subscription'), ctrl.extendSubscription);
router.put('/:id/cancel', authenticateAdmin, auditMiddleware('Subscription'), ctrl.cancelSubscription);
router.put('/:id/auto-renew', authenticateAdmin, ctrl.toggleAutoRenew);
router.put('/:id/compassionate', authenticateAdmin, auditMiddleware('Subscription'), ctrl.compassionateExtension);

module.exports = router;
