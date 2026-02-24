// Category Routes
const router = require('express').Router();
const { authenticateAdmin } = require('../middleware/auth');
const ctrl = require('../controllers/store.controller');

router.get('/', ctrl.getCategories);
router.post('/', authenticateAdmin, ctrl.createCategory);
router.put('/:id', authenticateAdmin, ctrl.updateCategory);
router.delete('/:id', authenticateAdmin, ctrl.deleteCategory);

module.exports = router;
