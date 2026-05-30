// ──────────────────────────────────────────────
//  Order Routes  /api/orders
//  Shipping rate fetch, user order list, tracking
// ──────────────────────────────────────────────

const router = require('express').Router();
const { authenticate, authenticateAdmin } = require('../middleware/auth');
const ctrl = require('../controllers/order.controller');

// ─── User endpoints ───────────────────────────

// POST /api/orders/checkout
// Multi-item cart checkout → creates ProductOrder, returns Razorpay amount
router.post('/checkout', authenticate, ctrl.checkoutCart);

// GET /api/orders/my-orders
// List all product orders for the logged-in user
router.get('/my-orders', authenticate, ctrl.getMyOrders);

// GET /api/orders/:id/tracking
// Get live Shiprocket tracking for a product order
router.get('/:id/tracking', authenticate, ctrl.getOrderTracking);

// POST /api/orders/shipping-rate
// Estimate shipping cost before placing order
// Body: { pincode, items: [{ weight, length, width, height }] }
router.post('/shipping-rate', authenticate, ctrl.getShippingRate);

// ─── Admin endpoints ──────────────────────────

// GET /api/orders/admin/all — paginated list of all product orders
router.get('/admin/all', authenticateAdmin, ctrl.getAdminOrders);

// PUT /api/orders/admin/:id/fulfill
// Manually mark as fulfilled (e.g. push Shiprocket order)
router.put('/admin/:id/fulfill', authenticateAdmin, ctrl.fulfillOrder);

// PUT /api/orders/admin/:id/status
// Update order status manually
router.put('/admin/:id/status', authenticateAdmin, ctrl.updateOrderStatus);

module.exports = router;
