// ──────────────────────────────────────────────
//  Status Transition Rules
//
//  Single source of truth for "is X → Y a legal status change" on Booking
//  and ProductOrder, plus the shared history-logging helper. Existed nowhere
//  before this — every status-update endpoint wrote `req.body.status`
//  straight into the DB with zero legality check, and order.controller.js /
//  store.controller.js each hardcoded their OWN, mutually inconsistent list
//  of valid ProductOrder statuses. This file replaces both.
//
//  ProductOrder.status stays a plain Prisma String (not a real enum) —
//  converting it would require a migration validating every live row before
//  the type change applies. This gives the same enforcement strength at the
//  application layer without that risk.
// ──────────────────────────────────────────────

const prisma = require('../config/database');

// ─── Booking ────────────────────────────────────────────────────────────────
// Mirrors the flow the admin UI's own quick-action buttons already imply
// (admin/src/components/pages/BookingsPage.jsx: ASSIGNED→Start(IN_PROGRESS),
// IN_PROGRESS→Complete(COMPLETED), Cancel from any non-terminal state).
const BOOKING_TRANSITIONS = {
    PENDING: ['CONFIRMED', 'CANCELLED'],
    CONFIRMED: ['ASSIGNED', 'CANCELLED'],
    ASSIGNED: ['IN_PROGRESS', 'CANCELLED'],
    IN_PROGRESS: ['COMPLETED', 'CANCELLED', 'SLA_BREACH'],
    SLA_BREACH: ['ASSIGNED', 'IN_PROGRESS', 'CANCELLED'], // recoverable after escalation
    COMPLETED: [],
    CANCELLED: [],
    // PAYMENT_PENDING / PAYMENT_FAILED are driven by updatePaymentStatus, a
    // separate field-adjacent flow — not part of this status graph.
};

// ─── ProductOrder ───────────────────────────────────────────────────────────
// Consolidated from the two previously-inconsistent arrays in
// order.controller.js and store.controller.js, plus the checklist's missing
// granular carrier states and a real RETURNED (previously RTO silently
// became CANCELLED, losing the distinction — see cron/index.js).
const PRODUCT_ORDER_STATUSES = [
    'PENDING', 'CONFIRMED', 'PAID', 'ACCEPTED', 'DELIVERY_CREATED',
    'PICKUP_ASSIGNED', 'PICKED_UP', 'DISPATCHED', 'IN_TRANSIT',
    'DELIVERED', 'RETURNED', 'CANCELLED',
];

const PRODUCT_ORDER_TRANSITIONS = {
    PENDING: ['CONFIRMED', 'CANCELLED'],
    CONFIRMED: ['PAID', 'ACCEPTED', 'CANCELLED'],
    PAID: ['ACCEPTED', 'CANCELLED'],
    ACCEPTED: ['DELIVERY_CREATED', 'CANCELLED'],
    DELIVERY_CREATED: ['PICKUP_ASSIGNED', 'DISPATCHED', 'CANCELLED'],
    PICKUP_ASSIGNED: ['PICKED_UP', 'CANCELLED'],
    PICKED_UP: ['IN_TRANSIT', 'DISPATCHED', 'CANCELLED'],
    DISPATCHED: ['IN_TRANSIT', 'DELIVERED', 'RETURNED'],
    IN_TRANSIT: ['DELIVERED', 'RETURNED'],
    DELIVERED: [],
    RETURNED: ['CANCELLED'],
    CANCELLED: [],
};

/**
 * @param {Record<string,string[]>} transitionMap
 * @param {string|null|undefined} from - current status (null/undefined = no existing row, always allowed)
 * @param {string} to - requested status
 * @returns {boolean}
 */
const isValidTransition = (transitionMap, from, to) => {
    if (!from || from === to) return true; // no-op update / first-ever status is always fine
    const allowed = transitionMap[from];
    return Array.isArray(allowed) && allowed.includes(to);
};

/**
 * Persist one row to StatusTransitionLog. Non-fatal — a logging failure
 * must never block the status update it's recording.
 * @param {object} opts
 * @param {'Booking'|'ProductOrder'} opts.entityType
 * @param {string} opts.entityId
 * @param {string|null} opts.fromStatus
 * @param {string} opts.toStatus
 * @param {string|null} [opts.changedBy] - adminId, or 'system'/'cron'/'webhook'
 * @param {boolean} [opts.forced]
 * @param {string} [opts.reason]
 */
const recordStatusTransition = async ({ entityType, entityId, fromStatus, toStatus, changedBy = null, forced = false, reason = null }) => {
    try {
        await prisma.statusTransitionLog.create({
            data: { entityType, entityId, fromStatus: fromStatus || null, toStatus, changedBy, forced, reason },
        });
    } catch (err) {
        // eslint-disable-next-line no-console
        console.warn(`[StatusTransitionLog] write failed for ${entityType}:${entityId}`, err.message);
    }
};

module.exports = {
    BOOKING_TRANSITIONS,
    PRODUCT_ORDER_STATUSES,
    PRODUCT_ORDER_TRANSITIONS,
    isValidTransition,
    recordStatusTransition,
};
