// Status Transition History Routes — admin-only, read-only
const router = require('express').Router();
const { authenticateAdmin } = require('../middleware/auth');
const ctrl = require('../controllers/statusHistory.controller');

router.get('/:entityType/:entityId', authenticateAdmin, ctrl.getStatusHistory);

module.exports = router;
