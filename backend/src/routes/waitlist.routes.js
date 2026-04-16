const express = require('express');
const router = express.Router();
const waitlistController = require('../controllers/waitlist.controller');
const { authenticateAdmin } = require('../middleware/auth');
const { authorize } = require('../middleware/rbac');

// Public endpoint
router.post('/', waitlistController.joinWaitlist);

// Protected admin endpoint
router.get('/', authenticateAdmin, authorize('SUPER_ADMIN', 'CITY_ADMIN', 'SUPPORT_AGENT'), waitlistController.getWaitlist);

module.exports = router;
