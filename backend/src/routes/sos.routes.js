// ──────────────────────────────────────────────
//  SOS Routes
// ──────────────────────────────────────────────

const express = require('express');
const router = express.Router();
const { triggerSOS } = require('../controllers/sos.controller');
const { authenticate } = require('../middleware/auth');

// Trigger SOS Alert (Protected)
router.post('/', authenticate, triggerSOS);

module.exports = router;
