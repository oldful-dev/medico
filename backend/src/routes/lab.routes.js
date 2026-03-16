// Lab Routes (Redcliffe Labs integration)
const router = require('express').Router();
const { authenticateUser } = require('../middleware/auth');
const ctrl = require('../controllers/lab.controller');

router.get('/tests', ctrl.getLabTests);           // public — browse tests
router.get('/packages', ctrl.getLabPackages);     // public — browse packages
router.post('/book', authenticateUser, ctrl.bookLabTest);
router.get('/booking/:id', authenticateUser, ctrl.getLabBooking);

module.exports = router;
