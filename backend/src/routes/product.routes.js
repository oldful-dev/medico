// Product Routes
const router = require('express').Router();
const { authenticate, authenticateAdmin } = require('../middleware/auth');
const ctrl = require('../controllers/store.controller');

// Public
router.get('/', ctrl.getProducts);
router.get('/:id', ctrl.getProductById);

// User
router.post('/:id/waitlist', authenticate, ctrl.joinWaitlist);

// Admin
router.post('/', authenticateAdmin, ctrl.createProduct);
router.put('/:id', authenticateAdmin, ctrl.updateProduct);
router.delete('/:id', authenticateAdmin, ctrl.deleteProduct);

module.exports = router;
