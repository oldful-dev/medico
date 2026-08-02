// Plan Routes
const router = require('express').Router();
const { authenticateAdmin } = require('../middleware/auth');
const { auditMiddleware } = require('../middleware/audit');
const { blockPaymentModulesForNonBilling } = require('../middleware/rbac');
const ctrl = require('../controllers/plan.controller');

// ─── Public ───────────────────────────────────────────────────────────────────
router.get('/', ctrl.getPlans);
router.get('/by-category/:planType', ctrl.getPlansByType);
router.get('/:id', ctrl.getPlanById);

// ─── Admin — plan CRUD (Finance module: SUPER_ADMIN + BILLING_EXECUTIVE only) ─
router.get('/admin/all',  authenticateAdmin, blockPaymentModulesForNonBilling, ctrl.getAllPlansAdmin);
router.post('/',          authenticateAdmin, blockPaymentModulesForNonBilling, auditMiddleware('Plan'), ctrl.createPlan);
router.put('/:id',        authenticateAdmin, blockPaymentModulesForNonBilling, auditMiddleware('Plan'), ctrl.updatePlan);
router.delete('/:id',     authenticateAdmin, blockPaymentModulesForNonBilling, auditMiddleware('Plan'), ctrl.deletePlan);

// ─── Admin — plan benefit CRUD ────────────────────────────────────────────────
router.get('/:id/benefits',                 authenticateAdmin, blockPaymentModulesForNonBilling, ctrl.getPlanBenefits);
router.post('/:id/benefits',               authenticateAdmin, blockPaymentModulesForNonBilling, ctrl.addPlanBenefit);
router.put('/:id/benefits/:benefitId',     authenticateAdmin, blockPaymentModulesForNonBilling, ctrl.updatePlanBenefit);
router.delete('/:id/benefits/:benefitId', authenticateAdmin, blockPaymentModulesForNonBilling, ctrl.deletePlanBenefit);

module.exports = router;
