// ──────────────────────────────────────────────
//  ProductOrder status helpers — shared by order-tracking.tsx and
//  order-history.tsx so both screens agree on what an unfamiliar backend
//  status collapses to. Mirrors backend/src/utils/statusTransitions.js's
//  PRODUCT_ORDER_STATUSES; update both together.
// ──────────────────────────────────────────────

export const PRODUCT_ORDER_STATUSES = [
    'PENDING', 'CONFIRMED', 'PAID', 'ACCEPTED', 'DELIVERY_CREATED',
    'PICKUP_ASSIGNED', 'PICKED_UP', 'DISPATCHED', 'IN_TRANSIT',
    'DELIVERED', 'RETURNED', 'CANCELLED',
] as const;

export const PRODUCT_ORDER_TERMINAL = new Set(['DELIVERED', 'CANCELLED', 'RETURNED']);

/** Any granular carrier status that isn't one of the 5 simplified display
 * stages (PENDING/PAID/CONFIRMED/DISPATCHED/DELIVERED) collapses to the
 * nearest one it represents, so screens using only those 5 stages still
 * show real progress instead of treating an unrecognized status as "none". */
export const DISPLAY_STAGE_ALIASES: Record<string, string> = {
    ACCEPTED: 'CONFIRMED',
    DELIVERY_CREATED: 'CONFIRMED',
    PICKUP_ASSIGNED: 'DISPATCHED',
    PICKED_UP: 'DISPATCHED',
    IN_TRANSIT: 'DISPATCHED',
    RETURNED: 'CANCELLED',
};

export const toDisplayStage = (status: string): string => DISPLAY_STAGE_ALIASES[status] || status;
