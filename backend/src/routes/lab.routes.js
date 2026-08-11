// Lab Routes (Redcliffe Labs integration)
const router = require('express').Router();
const { authenticateUser, authenticateAdmin } = require('../middleware/auth');
const ctrl = require('../controllers/lab.controller');
const holdCtrl = require('../controllers/redcliffeHold.controller');
const confirmCtrl = require('../controllers/redcliffeConfirm.controller');

// ─── Admin Routes ────────────────────────────
router.get('/admin/orders', authenticateAdmin, ctrl.adminGetLabOrders);
router.put('/booking/:id/reschedule', authenticateAdmin, ctrl.rescheduleLabOrder);
router.post('/booking/:id/admin-cancel', authenticateAdmin, ctrl.adminCancelLabOrder);
router.get('/admin/booking/:id/invoice', authenticateAdmin, ctrl.getLabOrderInvoice);

// ─── Location (public) ───────────────────────
router.get('/serviceability',   ctrl.checkServiceability);
router.get('/location/search',  ctrl.searchLocation);
router.get('/location/latlng',  ctrl.getLatLng);

// ─── Availability (public) ───────────────────
router.get('/time-slots', ctrl.getTimeSlots);

// ─── Packages (public) ───────────────────────
router.get('/packages',       ctrl.getPackages);
router.get('/packages/:code', ctrl.getPackageDetails);

// ─── User Orders (auth required) ──────────────
router.get('/my-orders', authenticateUser, ctrl.getUserLabOrders);

// ─── Booking (auth required) ─────────────────
router.post('/book/hold', authenticateUser, holdCtrl.holdBooking);
router.post('/book/confirm', authenticateUser, confirmCtrl.confirmBooking);

router.post('/book',                        authenticateUser, ctrl.bookLabTest);
router.post('/booking/:id/confirm',         authenticateUser, ctrl.confirmLabBooking);
router.get( '/booking/:id',                 authenticateUser, ctrl.getLabBookingStatus);
router.post('/booking/:id/update',          authenticateUser, ctrl.updateLabBooking);
router.post('/booking/:id/members',         authenticateUser, ctrl.addLabMember);
router.post('/booking/:id/payment-mode',    authenticateUser, ctrl.updateLabPaymentMode);
router.post('/booking/:id/packages',        authenticateUser, ctrl.updateLabPackage);
router.post('/booking/:id/cancel',          authenticateUser, ctrl.cancelLabOrder);
router.get( '/booking/:id/digital-report',  authenticateUser, ctrl.getDigitalReport);
router.get( '/booking/:id/report',          authenticateUser, ctrl.getConsolidatedReport);
router.get( '/booking/:id/invoice',         authenticateUser, ctrl.getLabOrderInvoice);

module.exports = router;
