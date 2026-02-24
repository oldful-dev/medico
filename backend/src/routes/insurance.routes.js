// Insurance Routes
const router = require('express').Router();
const { authenticate, authenticateAdmin } = require('../middleware/auth');
const ctrl = require('../controllers/insurance.controller');

// Public / App
router.get('/plans', ctrl.getInsurancePlans);
router.post('/calculate-premium', ctrl.calculatePremium);

// User
router.post('/applications', authenticate, ctrl.submitApplication);
router.get('/applications/:id', authenticate, ctrl.getApplicationById);

// Admin
router.get('/applications', authenticateAdmin, ctrl.getApplications);
router.put('/applications/:id', authenticateAdmin, ctrl.updateApplication);

module.exports = router;
