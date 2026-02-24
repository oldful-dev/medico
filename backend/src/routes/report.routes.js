// Report Routes
const router = require('express').Router();
const { authenticateAdmin } = require('../middleware/auth');
const ctrl = require('../controllers/report.controller');

router.use(authenticateAdmin);

router.get('/dashboard', ctrl.dashboardSummary);
router.get('/revenue-by-city', ctrl.revenueByCity);
router.get('/revenue-by-plan', ctrl.revenueByPlan);
router.get('/service-usage', ctrl.serviceUsage);
router.get('/caregiver-performance', ctrl.caregiverPerformance);
router.get('/refund-analysis', ctrl.refundAnalysis);
router.get('/customer-retention', ctrl.customerRetention);
router.get('/csv/:type', ctrl.exportCSV);

module.exports = router;
