// Plan Routes
const router = require('express').Router();
const { authenticateAdmin } = require('../middleware/auth');
const { auditMiddleware } = require('../middleware/audit');
const ctrl = require('../controllers/plan.controller');

// ─── Public ───────────────────────────────────────────────────────────────────
router.get('/', ctrl.getPlans);
router.get('/by-category/:planType', ctrl.getPlansByType);
router.get('/:id', ctrl.getPlanById);

// ─── Admin — plan CRUD ────────────────────────────────────────────────────────
router.get('/admin/all', authenticateAdmin, ctrl.getAllPlansAdmin);
router.post('/', authenticateAdmin, auditMiddleware('Plan'), ctrl.createPlan);
router.put('/:id', authenticateAdmin, auditMiddleware('Plan'), ctrl.updatePlan);
router.delete('/:id', authenticateAdmin, auditMiddleware('Plan'), ctrl.deletePlan);

// ─── Admin — plan benefit CRUD ────────────────────────────────────────────────
router.get('/:id/benefits', authenticateAdmin, ctrl.getPlanBenefits);
router.post('/:id/benefits', authenticateAdmin, ctrl.addPlanBenefit);
router.put('/:id/benefits/:benefitId', authenticateAdmin, ctrl.updatePlanBenefit);
router.delete('/:id/benefits/:benefitId', authenticateAdmin, ctrl.deletePlanBenefit);

module.exports = router;
