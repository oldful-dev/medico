// ──────────────────────────────────────────────
//  SOS Routes
// ──────────────────────────────────────────────

const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/sos.controller');
const { authenticateUser, authenticateAdmin } = require('../middleware/auth');
const { authorize } = require('../middleware/rbac');

// ─── USER ROUTES (App) ──────────────────────────────────
// Trigger SOS Alert
router.post('/', authenticateUser, ctrl.triggerSOS);

// ─── ADMIN ROUTES (Panel) ──────────────────────────────
// List SOS Alerts
router.get('/', authenticateAdmin, authorize('CITY_ADMIN', 'SUPER_ADMIN'), ctrl.getSOSAlerts);

// Assign Responder
router.put('/:id/assign', authenticateAdmin, authorize('CITY_ADMIN', 'SUPER_ADMIN'), ctrl.assignResponder);

// Resolve Alert
router.put('/:id/resolve', authenticateAdmin, authorize('CITY_ADMIN', 'SUPER_ADMIN'), ctrl.resolveSOS);

// Update Notification Logs
router.put('/:id/notify', authenticateAdmin, authorize('CITY_ADMIN', 'SUPER_ADMIN'), ctrl.updateSOSNotification);

module.exports = router;
