// ──────────────────────────────────────────────
//  SOS Routes
// ──────────────────────────────────────────────

const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/sos.controller');
const { authenticateUser, authenticateAdmin } = require('../middleware/auth');
const { authorize } = require('../middleware/rbac');

// All roles that can access SOS (all except BILLING_EXECUTIVE per spec)
const SOS_ROLES = ['SUPER_ADMIN', 'CITY_ADMIN', 'OPERATIONS_EXECUTIVE', 'CARE_MANAGER', 'SUPPORT_AGENT'];

// ─── USER ROUTES (App) ──────────────────────────────────
router.post('/', authenticateUser, ctrl.triggerSOS);
router.get('/my-alerts', authenticateUser, ctrl.getMySOSAlerts);

// ─── ADMIN ROUTES (Panel) ──────────────────────────────
router.get('/',          authenticateAdmin, authorize(...SOS_ROLES), ctrl.getSOSAlerts);
router.put('/:id/assign',  authenticateAdmin, authorize(...SOS_ROLES), ctrl.assignResponder);
router.put('/:id/resolve', authenticateAdmin, authorize(...SOS_ROLES), ctrl.resolveSOS);
router.put('/:id/notify',  authenticateAdmin, authorize(...SOS_ROLES), ctrl.updateSOSNotification);

module.exports = router;
