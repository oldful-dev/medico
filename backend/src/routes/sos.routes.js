// ──────────────────────────────────────────────
//  SOS Routes
// ──────────────────────────────────────────────

const express = require('express');
const router = express.Router();
const { triggerSOS } = require('../controllers/sos.controller');
const { authenticateUser } = require('../middleware/auth');

// Trigger SOS Alert (App users only)
router.post('/', authenticateUser, triggerSOS);

module.exports = router;
