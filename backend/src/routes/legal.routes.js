// Legal CMS Routes
const router = require('express').Router();
const { authenticateAdmin } = require('../middleware/auth');
const ctrl = require('../controllers/legal.controller');

// Public (App)
router.get('/published/:type', ctrl.getPublishedDocument);

// Admin
router.get('/', authenticateAdmin, ctrl.getLegalDocuments);
router.get('/:id', authenticateAdmin, ctrl.getLegalDocumentById);
router.post('/', authenticateAdmin, ctrl.createLegalDocument);
router.put('/:id', authenticateAdmin, ctrl.updateLegalDocument);
router.put('/:id/publish', authenticateAdmin, ctrl.publishLegalDocument);

module.exports = router;
