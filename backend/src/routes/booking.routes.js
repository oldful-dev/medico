// Booking Routes
const router = require('express').Router();
const { authenticate, authenticateAdmin, authenticateUser } = require('../middleware/auth');
const { cityRestriction } = require('../middleware/rbac');
const { auditMiddleware } = require('../middleware/audit');
const ctrl = require('../controllers/booking.controller');

// App User routes
router.get('/history', authenticateUser, ctrl.getMyBookings);
router.post('/:id/cancel', authenticateUser, ctrl.cancelBooking);

// Admin routes
router.get('/', authenticateAdmin, cityRestriction, ctrl.getBookings);
router.get('/:id', authenticateAdmin, ctrl.getBookingById);
router.post('/', authenticate, ctrl.createBooking);
router.put('/:id/assign', authenticateAdmin, auditMiddleware('Booking'), ctrl.assignCaregiver);
router.put('/:id/reassign', authenticateAdmin, auditMiddleware('Booking'), ctrl.reassignCaregiver);
router.put('/:id/status', authenticateAdmin, auditMiddleware('Booking'), ctrl.updateBookingStatus);
router.put('/:id/escalate', authenticateAdmin, auditMiddleware('Booking'), ctrl.escalateBooking);

module.exports = router;
