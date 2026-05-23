// Meetup Routes — Local Meetup Feature
const router = require('express').Router();
const { authenticateUser, authenticateAdmin } = require('../middleware/auth');
const ctrl = require('../controllers/meetup.controller');

// ─── User (auth required) — must come before /:id ────────────────
router.get('/my-registrations',                  authenticateUser, ctrl.getMyRegistrations);
router.get('/registrations/:regId',              authenticateUser, ctrl.getRegistrationById);
router.post('/registrations/:regId/cancel',      authenticateUser, ctrl.cancelRegistration);

// ─── Admin — must come before /:id ───────────────────────────────
router.post('/admin',                            authenticateAdmin, ctrl.createMeetup);
router.put('/admin/registrations/:regId',        authenticateAdmin, ctrl.updateRegistrationStatus);
router.put('/admin/:id',                         authenticateAdmin, ctrl.updateMeetup);
router.delete('/admin/:id',                      authenticateAdmin, ctrl.deleteMeetup);
router.get('/admin/:id/registrations',           authenticateAdmin, ctrl.getMeetupRegistrations);

// ─── Public ──────────────────────────────────────────────────────
router.get('/',     ctrl.getMeetups);
router.get('/:id',  ctrl.getMeetupById);

// ─── User: register (after public routes so /:id doesn't shadow) ─
router.post('/:id/register',                     authenticateUser, ctrl.registerForMeetup);

module.exports = router;
