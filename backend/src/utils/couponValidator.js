// ──────────────────────────────────────────────
//  Coupon validation — one place, used by both the "apply coupon" preview
//  (payment.controller.applyCoupon) and the actual charge (initiatePayment),
//  so an expired / exhausted / per-user-capped coupon can't slip through at
//  payment time the way it used to when only applyCoupon checked those.
// ──────────────────────────────────────────────

const prisma = require('../config/database');

/**
 * @param {{ code: string, amount: number, userId?: string }} p
 * @returns {Promise<{ valid: boolean, reason?: string, discount: number, coupon?: object }>}
 */
async function validateCoupon({ code, amount, userId }) {
    if (!code) return { valid: false, reason: 'No coupon code', discount: 0 };

    const coupon = await prisma.coupon.findUnique({ where: { code: String(code).trim().toUpperCase() } });
    if (!coupon || !coupon.isActive) {
        return { valid: false, reason: 'Invalid coupon', discount: 0 };
    }

    // Reward coupons (referral welcome / referrer bonus) are locked to one user.
    if (coupon.reservedForUserId && coupon.reservedForUserId !== userId) {
        return { valid: false, reason: 'This coupon is not available on your account', discount: 0 };
    }

    const now = new Date();
    if (coupon.validFrom && now < coupon.validFrom) {
        return { valid: false, reason: 'Coupon is not active yet', discount: 0 };
    }
    if (coupon.validUntil && now > coupon.validUntil) {
        return { valid: false, reason: 'Coupon expired', discount: 0 };
    }
    if (coupon.usageLimit != null && coupon.usedCount >= coupon.usageLimit) {
        return { valid: false, reason: 'Coupon usage limit reached', discount: 0 };
    }
    if (coupon.minOrderValue != null && Number(amount) < coupon.minOrderValue) {
        return { valid: false, reason: `Minimum order ₹${coupon.minOrderValue}`, discount: 0 };
    }

    if (coupon.perUserLimit != null && userId) {
        const usedByUser = await prisma.couponRedemption.count({
            where: { couponId: coupon.id, userId },
        });
        if (usedByUser >= coupon.perUserLimit) {
            return { valid: false, reason: 'You have already used this coupon', discount: 0 };
        }
    }

    // Discount — never exceeds the order amount, never negative.
    let discount = coupon.discountType === 'percentage'
        ? (Number(amount) * coupon.discountValue) / 100
        : coupon.discountValue;
    if (coupon.maxDiscount != null) discount = Math.min(discount, coupon.maxDiscount);
    discount = Math.max(0, Math.min(Math.round(discount * 100) / 100, Number(amount)));

    return { valid: true, discount, coupon };
}

module.exports = { validateCoupon };
