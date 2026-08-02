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
router.post('/verify',              authenticate, ctrl.verifyUserSubscription);

// Per-subscription actions
router.post('/:id/calculate-adjustment',  authenticate, ctrl.calculateAdjustment);
router.post('/:id/execute-transition',    authenticate, ctrl.executeTransition);
router.post('/:id/renew',                 authenticate, ctrl.executeRenew);
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
