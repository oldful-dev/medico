// Plan Routes
const router = require('express').Router();
const { authenticateAdmin } = require('../middleware/auth');
const { auditMiddleware } = require('../middleware/audit');
const ctrl = require('../controllers/plan.controller');

router.get('/', ctrl.getPlans);  // Public - only visible plans
router.get('/admin/all', authenticateAdmin, ctrl.getAllPlansAdmin);  // Admin - all plans
router.get('/by-category/:planType', ctrl.getPlansByType);  // Public - plans filtered by type (CARE/HOMEMAKER)
router.get('/:id', ctrl.getPlanById);

router.post('/', authenticateAdmin, auditMiddleware('Plan'), ctrl.createPlan);
router.put('/:id', authenticateAdmin, auditMiddleware('Plan'), ctrl.updatePlan);
router.delete('/:id', authenticateAdmin, auditMiddleware('Plan'), ctrl.deletePlan);

module.exports = router;
