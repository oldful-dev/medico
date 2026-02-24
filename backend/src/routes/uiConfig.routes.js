// UI Config Routes
const router = require('express').Router();
const { authenticateAdmin } = require('../middleware/auth');
const ctrl = require('../controllers/uiConfig.controller');

// Public
router.get('/published', ctrl.getPublishedConfigs);

// Admin
router.get('/', authenticateAdmin, ctrl.getUIConfigs);
router.get('/:id', authenticateAdmin, ctrl.getUIConfigById);
router.post('/', authenticateAdmin, ctrl.createUIConfig);
router.put('/:id', authenticateAdmin, ctrl.updateUIConfig);
router.put('/:id/publish', authenticateAdmin, ctrl.publishUIConfig);
router.delete('/:id', authenticateAdmin, ctrl.deleteUIConfig);

module.exports = router;
