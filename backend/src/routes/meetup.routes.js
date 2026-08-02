// Meetup Routes — Local Meetup Feature
const router = require('express').Router();
const { authenticateUser, authenticateAdmin } = require('../middleware/auth');
const { blockNonManagement } = require('../middleware/rbac');
const ctrl = require('../controllers/meetup.controller');

// ─── User (auth required) — must come before /:id ────────────────
router.get('/my-registrations',             authenticateUser, ctrl.getMyRegistrations);
router.get('/registrations/:regId',         authenticateUser, ctrl.getRegistrationById);
router.post('/registrations/:regId/cancel', authenticateUser, ctrl.cancelRegistration);

// ─── Admin (SUPER_ADMIN, CITY_ADMIN, OPERATIONS_EXECUTIVE only) ───
router.post('/admin',                           authenticateAdmin, blockNonManagement, ctrl.createMeetup);
router.put('/admin/registrations/:regId',        authenticateAdmin, blockNonManagement, ctrl.updateRegistrationStatus);
router.put('/admin/:id',                         authenticateAdmin, blockNonManagement, ctrl.updateMeetup);
router.delete('/admin/:id',                      authenticateAdmin, blockNonManagement, ctrl.deleteMeetup);
router.get('/admin/:id/registrations',           authenticateAdmin, blockNonManagement, ctrl.getMeetupRegistrations);

// ─── Public ──────────────────────────────────────────────────────
router.get('/',     ctrl.getMeetups);
router.get('/:id',  ctrl.getMeetupById);

// ─── User: register ───────────────────────────────────────────────
router.post('/:id/register', authenticateUser, ctrl.registerForMeetup);

module.exports = router;
