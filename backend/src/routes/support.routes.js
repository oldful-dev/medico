// Support & Ticket Routes
const router = require('express').Router();
const { authenticate, authenticateAdmin } = require('../middleware/auth');
const ctrl = require('../controllers/support.controller');

// User
router.get('/my-tickets', authenticate, ctrl.getMyTickets);
router.post('/tickets', authenticate, ctrl.createTicket);
router.get('/tickets/:id', authenticate, ctrl.getTicketById);
router.post('/tickets/:id/messages', authenticate, ctrl.addMessage);

// Admin
router.get('/tickets', authenticateAdmin, ctrl.getTickets);
router.put('/tickets/:id', authenticateAdmin, ctrl.updateTicket);
router.put('/tickets/:id/resolve', authenticateAdmin, ctrl.resolveTicket);

// Public
router.post('/webhook/inbound-email', ctrl.handleInboundEmail);
router.post('/careers', ctrl.submitCareers);

module.exports = router;
