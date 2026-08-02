// Support & Ticket Routes
const router = require('express').Router();
const { authenticate, authenticateAdmin } = require('../middleware/auth');
const { authorize } = require('../middleware/rbac');
const ctrl = require('../controllers/support.controller');

// Support roles that can manage admin tickets
const SUPPORT_ADMIN_ROLES = ['SUPER_ADMIN', 'CITY_ADMIN', 'OPERATIONS_EXECUTIVE', 'SUPPORT_AGENT'];

// User-facing routes
router.get('/my-tickets',           authenticate, ctrl.getMyTickets);
router.post('/tickets',             authenticate, ctrl.createTicket);
router.get('/tickets/:id',          authenticate, ctrl.getTicketById);
router.post('/tickets/:id/messages', authenticate, ctrl.addMessage);

// Admin routes (SUPER_ADMIN, CITY_ADMIN, OPERATIONS_EXECUTIVE, SUPPORT_AGENT only)
router.get('/tickets',             authenticateAdmin, authorize(...SUPPORT_ADMIN_ROLES), ctrl.getTickets);
router.put('/tickets/:id',         authenticateAdmin, authorize(...SUPPORT_ADMIN_ROLES), ctrl.updateTicket);
router.put('/tickets/:id/resolve', authenticateAdmin, authorize(...SUPPORT_ADMIN_ROLES), ctrl.resolveTicket);

// Public
router.post('/webhook/inbound-email', ctrl.handleInboundEmail);
router.post('/careers',               ctrl.submitCareers);
router.post('/subscribe',             ctrl.subscribeNewsletter);

module.exports = router;
