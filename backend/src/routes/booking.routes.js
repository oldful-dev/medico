// Booking Routes
const router = require('express').Router();
const { authenticate, authenticateAdmin, authenticateUser } = require('../middleware/auth');
const { cityRestriction, blockNonOperational, blockPaymentModulesForNonBilling } = require('../middleware/rbac');
const { auditMiddleware } = require('../middleware/audit');
const ctrl = require('../controllers/booking.controller');

// App User routes
router.get('/history', authenticateUser, ctrl.getMyBookings);
router.get('/detail/:id', authenticateUser, ctrl.getMyBookingById);
router.get('/:id/invoice', authenticateUser, ctrl.downloadInvoice);
router.get('/admin/:id/invoice', authenticateAdmin, ctrl.downloadInvoice);
router.post('/:id/cancel', authenticateUser, ctrl.cancelBooking);

// Admin routes
router.get('/', authenticateAdmin, cityRestriction, ctrl.getBookings);
router.get('/:id', authenticateAdmin, ctrl.getBookingById);
router.post('/', authenticateUser, ctrl.createBooking);
router.put('/:id/assign',         authenticateAdmin, blockNonOperational, auditMiddleware('Booking'), ctrl.assignCaregiver);
router.put('/:id/reassign',       authenticateAdmin, blockNonOperational, auditMiddleware('Booking'), ctrl.reassignCaregiver);
router.put('/:id/status',         authenticateAdmin, blockNonOperational, auditMiddleware('Booking'), ctrl.updateBookingStatus);
router.put('/:id/payment-status', authenticateAdmin, blockPaymentModulesForNonBilling, auditMiddleware('Booking'), ctrl.updatePaymentStatus);
router.put('/:id/service-person', authenticateAdmin, blockNonOperational, auditMiddleware('Booking'), ctrl.updateServicePerson);
router.put('/:id/escalate',       authenticateAdmin, blockNonOperational, auditMiddleware('Booking'), ctrl.escalateBooking);

module.exports = router;
