// Subscription Routes
const router = require('express').Router();
const { authenticate, authenticateAdmin } = require('../middleware/auth');
const { auditMiddleware } = require('../middleware/audit');
const { blockPaymentModulesForNonBilling } = require('../middleware/rbac');
const ctrl = require('../controllers/subscription.controller');

// ─── User routes ──────────────────────────────────────────────────────────────
router.get('/me/active',            authenticate, ctrl.checkUserActiveSubscription);
router.get('/my-benefits',          authenticate, ctrl.getMyBenefits);
router.get('/me/memberships',       authenticate, ctrl.getMemberships);
router.get('/me/upgrade-history',   authenticate, ctrl.getUpgradeHistory);
router.post('/initiate',            authenticate, ctrl.initiateUserSubscription);
// Retired: these three endpoints changed subscription state without verifying a payment (or, for
// execute-transition, subscription ownership). No client calls them; activation goes through
// /initiate + the Razorpay-verified payment pipeline, and upgrades through /:id/upgrade.
const retired = (req, res) => res.status(410).json({ success: false, message: 'This endpoint has been retired.' });
router.post('/verify',              authenticate, retired);

// Per-subscription actions
router.post('/:id/calculate-adjustment',  authenticate, ctrl.calculateAdjustment);
router.post('/:id/execute-transition',    authenticate, retired);
router.post('/:id/renew',                 authenticate, retired);
router.get( '/:id/available-upgrades',   authenticate, ctrl.getAvailableUpgrades);
router.post('/:id/calculate-upgrade',    authenticate, ctrl.calculateUpgrade);
router.post('/:id/upgrade',              authenticate, ctrl.executeUpgrade);

// ─── Admin routes (Finance module: SUPER_ADMIN + BILLING_EXECUTIVE only) ──────
router.get('/',                     authenticateAdmin, blockPaymentModulesForNonBilling, ctrl.getSubscriptions);
router.post('/',                    authenticateAdmin, blockPaymentModulesForNonBilling, auditMiddleware('Subscription'), ctrl.createSubscription);
router.put('/:id/pause',            authenticateAdmin, blockPaymentModulesForNonBilling, auditMiddleware('Subscription'), ctrl.pauseSubscription);
router.put('/:id/resume',           authenticateAdmin, blockPaymentModulesForNonBilling, auditMiddleware('Subscription'), ctrl.resumeSubscription);
router.put('/:id/extend',           authenticateAdmin, blockPaymentModulesForNonBilling, auditMiddleware('Subscription'), ctrl.extendSubscription);
router.put('/:id/cancel',           authenticateAdmin, blockPaymentModulesForNonBilling, auditMiddleware('Subscription'), ctrl.cancelSubscription);
router.put('/:id/auto-renew',       authenticateAdmin, blockPaymentModulesForNonBilling, ctrl.toggleAutoRenew);
router.put('/:id/compassionate',    authenticateAdmin, blockPaymentModulesForNonBilling, auditMiddleware('Subscription'), ctrl.compassionateExtension);

module.exports = router;
