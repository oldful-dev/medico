// Subscription Routes
const router = require('express').Router();
const { authenticate, authenticateAdmin } = require('../middleware/auth');
const { auditMiddleware } = require('../middleware/audit');
const ctrl = require('../controllers/subscription.controller');

// ─── User routes ──────────────────────────────────────────────────────────────
router.get('/me/active',            authenticate, ctrl.checkUserActiveSubscription);
router.get('/me/memberships',       authenticate, ctrl.getMemberships);
router.get('/me/upgrade-history',   authenticate, ctrl.getUpgradeHistory);
router.post('/initiate',            authenticate, ctrl.initiateUserSubscription);
router.post('/verify',              authenticate, ctrl.verifyUserSubscription);

// Per-subscription actions (order: static paths before :id)
router.post('/:id/calculate-adjustment',  authenticate, ctrl.calculateAdjustment);
router.post('/:id/execute-transition',    authenticate, ctrl.executeTransition);
router.post('/:id/renew',                 authenticate, ctrl.executeRenew);
// New membership routes
router.get( '/:id/available-upgrades',   authenticate, ctrl.getAvailableUpgrades);
router.post('/:id/calculate-upgrade',    authenticate, ctrl.calculateUpgrade);
router.post('/:id/upgrade',              authenticate, ctrl.executeUpgrade);

// ─── Admin routes ─────────────────────────────────────────────────────────────
router.get('/',                     authenticateAdmin, ctrl.getSubscriptions);
router.post('/',                    authenticateAdmin, auditMiddleware('Subscription'), ctrl.createSubscription);
router.put('/:id/pause',            authenticateAdmin, auditMiddleware('Subscription'), ctrl.pauseSubscription);
router.put('/:id/resume',           authenticateAdmin, auditMiddleware('Subscription'), ctrl.resumeSubscription);
router.put('/:id/extend',           authenticateAdmin, auditMiddleware('Subscription'), ctrl.extendSubscription);
router.put('/:id/cancel',           authenticateAdmin, auditMiddleware('Subscription'), ctrl.cancelSubscription);
router.put('/:id/auto-renew',       authenticateAdmin, ctrl.toggleAutoRenew);
router.put('/:id/compassionate',    authenticateAdmin, auditMiddleware('Subscription'), ctrl.compassionateExtension);

module.exports = router;

