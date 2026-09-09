// ──────────────────────────────────────────────
//  Fee Breakdown — single source of truth for the fee split
//
//  Every paid order is broken into FOUR customer-facing components:
//
//    serviceFee      — the actual cost of the service/test/product, paid to the
//                      Ayuxa employee / partner / third-party / diagnostic provider.
//    ayuxaBookingFee — Ayuxa's fee for facilitating & managing the booking.
//                      This is the sum of the configured bookingFee + platformFee
//                      + any convenience/visit/night/surge admin charges. It is
//                      ONE customer-facing number so invoices/screens never mix
//                      or ambiguously split "Ayuxa" money.
//    deliveryFee     — collection / delivery / logistics (sample pickup, shipping).
//    taxAmount       — GST on whatever portion is taxable for this service type.
//
//    finalPayable = serviceFee + ayuxaBookingFee + deliveryFee + taxAmount - discount
//
//  Used by booking creation, lab-order creation, product-order creation and
//  invoice generation so the persisted numbers are identical everywhere.
// ──────────────────────────────────────────────

/**
 * Build the canonical fee split.
 *
 * @param {object} p
 * @param {number} p.serviceFee      Provider/vendor/diagnostic/product cost.
 * @param {number} [p.bookingFee]    Configured Ayuxa booking fee (pre-waiver).
 * @param {number} [p.platformFee]   Configured Ayuxa platform fee (pre-waiver).
 * @param {number} [p.convenienceFee]
 * @param {number} [p.emergencyFee]
 * @param {number} [p.visitFee]
 * @param {number} [p.nightCharge]
 * @param {number} [p.surgeCharge]
 * @param {number} [p.deliveryFee]   Sample collection / shipping charge.
 * @param {number} [p.taxAmount]     Pre-computed GST amount (from the same calc
 *                                   path the customer saw). If omitted it stays 0.
 * @param {number} [p.discount]      Coupon / benefit discount already applied.
 * @returns {{serviceFee:number, ayuxaBookingFee:number, deliveryFee:number, taxAmount:number, discount:number, finalPayable:number, components:object}}
 */
function buildFeeBreakdown(p = {}) {
    const n = (v) => Math.round((Number(v) || 0) * 100) / 100;

    const serviceFee = n(p.serviceFee);
    const bookingFee = n(p.bookingFee);
    const platformFee = n(p.platformFee);
    const convenienceFee = n(p.convenienceFee);
    const emergencyFee = n(p.emergencyFee);
    const visitFee = n(p.visitFee);
    const nightCharge = n(p.nightCharge);
    const surgeCharge = n(p.surgeCharge);
    const deliveryFee = n(p.deliveryFee);
    const taxAmount = n(p.taxAmount);
    const discount = n(p.discount);

    // Everything Ayuxa charges for handling the booking, rolled into one number.
    const ayuxaBookingFee = n(
        bookingFee + platformFee + convenienceFee + emergencyFee + visitFee + nightCharge + surgeCharge
    );

    const finalPayable = n(serviceFee + ayuxaBookingFee + deliveryFee + taxAmount - discount);

    return {
        serviceFee,
        ayuxaBookingFee,
        deliveryFee,
        taxAmount,
        discount,
        finalPayable,
        // Itemised snapshot for audit / admin drill-down — never shown raw to the
        // customer, but lets ops see exactly how ayuxaBookingFee was composed.
        components: {
            bookingFee,
            platformFee,
            convenienceFee,
            emergencyFee,
            visitFee,
            nightCharge,
            surgeCharge,
        },
    };
}

/**
 * Derive the split from whatever a client sent + a known total, when no explicit
 * breakdown is available (legacy payloads). Best-effort: assumes the passed
 * ayuxaBookingFee/deliveryFee/taxAmount are trustworthy and the remainder is the
 * service fee. Never returns negatives.
 */
function deriveFeeBreakdown({ total, ayuxaBookingFee = 0, deliveryFee = 0, taxAmount = 0, discount = 0 }) {
    const n = (v) => Math.round((Number(v) || 0) * 100) / 100;
    const t = n(total);
    const abf = n(ayuxaBookingFee);
    const del = n(deliveryFee);
    const tax = n(taxAmount);
    const disc = n(discount);
    const serviceFee = Math.max(0, n(t + disc - abf - del - tax));
    return { serviceFee, ayuxaBookingFee: abf, deliveryFee: del, taxAmount: tax, discount: disc, finalPayable: t };
}

module.exports = { buildFeeBreakdown, deriveFeeBreakdown };
