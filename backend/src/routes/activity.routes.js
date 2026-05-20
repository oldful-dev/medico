const router = require('express').Router();
const { authenticateUser, authenticateAdmin } = require('../middleware/auth');
const ctrl = require('../controllers/activity.controller');

// Admin: all activity updates across all orders (feed)
router.get('/admin/all', authenticateAdmin, ctrl.adminGetAllUpdates);

// Admin: assign staff + create activity update for a lab order
router.post('/lab-orders/:id/assign', authenticateAdmin, ctrl.assignStaff);

// Admin: view all activity updates for a lab order
router.get('/lab-orders/:id', authenticateAdmin, ctrl.getOrderUpdates);

// Admin: edit activity update
router.put('/updates/:id', authenticateAdmin, ctrl.updateUpdate);

// Admin: delete activity update
router.delete('/updates/:id', authenticateAdmin, ctrl.deleteUpdate);

// User: fetch all my activity updates across all orders
router.get('/my-updates', authenticateUser, ctrl.getMyUpdates);

module.exports = router;
