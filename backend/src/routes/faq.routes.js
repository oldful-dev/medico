// FAQ Routes
const router = require('express').Router();
const { authenticateAdmin } = require('../middleware/auth');
const { auditMiddleware } = require('../middleware/audit');
const { blockNonOperational } = require('../middleware/rbac');
const ctrl = require('../controllers/faq.controller');

// Admin routes (must be before :id routes to avoid parameter shadowing)
router.get('/',         authenticateAdmin, blockNonOperational, ctrl.getAllFAQs);
router.post('/',        authenticateAdmin, blockNonOperational, auditMiddleware('FAQ'), ctrl.createFAQ);
router.post('/reorder', authenticateAdmin, blockNonOperational, ctrl.reorderFAQs);

// Public routes (App + Website)
router.get('/published', ctrl.getPublishedFAQs);

// Param routes (after specific routes)
router.get('/:id',          ctrl.getFAQById);
router.put('/:id',          authenticateAdmin, blockNonOperational, auditMiddleware('FAQ'), ctrl.updateFAQ);
router.patch('/:id/toggle', authenticateAdmin, blockNonOperational, ctrl.toggleFAQStatus);
router.delete('/:id',       authenticateAdmin, blockNonOperational, auditMiddleware('FAQ'), ctrl.deleteFAQ);

module.exports = router;
