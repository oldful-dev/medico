// ──────────────────────────────────────────────
//  Order Routes  /api/orders
//  Shipping rate fetch, user order list, tracking
// ──────────────────────────────────────────────

const router = require('express').Router();
const { authenticate, authenticateAdmin } = require('../middleware/auth');
const { authorize } = require('../middleware/rbac');
const ctrl = require('../controllers/order.controller');

// These admin routes previously had NO role gate at all — any authenticated
// admin (including a future CONTENT_ADMIN/SUPPORT_AGENT) could fulfill
// orders, change their status, or retry a failed shipment. Operations runs
// wellness fulfillment day-to-day; Billing has a financial reason to see/
// retry fulfillment tied to order amounts and refunds.
const ORDER_ADMIN_ROLES = ['SUPER_ADMIN', 'OPERATIONS_EXECUTIVE', 'BILLING_EXECUTIVE'];

// ─── User endpoints ───────────────────────────

// POST /api/orders/checkout
// Multi-item cart checkout → creates ProductOrder, returns Razorpay amount
router.post('/checkout', authenticate, ctrl.checkoutCart);

// GET /api/orders/my-orders
// List all product orders for the logged-in user
router.get('/my-orders', authenticate, ctrl.getMyOrders);

// GET /api/orders/:id/tracking
// Get live Delhivery tracking for a product order
router.get('/:id/tracking', authenticate, ctrl.getOrderTracking);

// GET /api/orders/:id/invoice
// Download GST invoice PDF for a product order
router.get('/:id/invoice', authenticate, ctrl.downloadOrderInvoice);

// POST /api/orders/shipping-rate
// Estimate shipping cost before placing order
// Body: { pincode, items: [{ weight, length, width, height }] }
router.post('/shipping-rate', authenticate, ctrl.getShippingRate);

// ─── Admin endpoints ──────────────────────────

// GET /api/orders/admin/all — paginated list of all product orders
router.get('/admin/all', authenticateAdmin, authorize(...ORDER_ADMIN_ROLES), ctrl.getAdminOrders);

// PUT /api/orders/admin/:id/fulfill
// Manually mark as fulfilled (e.g. push Delhivery order)
router.put('/admin/:id/fulfill', authenticateAdmin, authorize(...ORDER_ADMIN_ROLES), ctrl.fulfillOrder);

// PUT /api/orders/admin/:id/status
// Update order status manually
router.put('/admin/:id/status', authenticateAdmin, authorize(...ORDER_ADMIN_ROLES), ctrl.updateOrderStatus);

// POST /api/orders/admin/:id/retry-fulfillment
// Re-attempt Delhivery shipment creation after a failed auto-fulfillment
router.post('/admin/:id/retry-fulfillment', authenticateAdmin, authorize(...ORDER_ADMIN_ROLES), ctrl.retryFulfillment);

module.exports = router;
