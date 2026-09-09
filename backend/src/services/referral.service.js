// ──────────────────────────────────────────────
//  Referral System
//
//  Flow:
//   1. Every user has a permanent `referralCode` (generated on create / backfilled).
//   2. A new user may enter someone's code at signup → linkReferralAtSignup():
//      - validates (code exists, program on, not self, referee not already referred)
//      - sets User.referredById, creates Referral(PENDING)
//      - issues the referee a single-use welcome coupon
//   3. Referee's FIRST successful payment → qualifyReferral():
//      - marks Referral QUALIFIED
//      - if the referrer is under their reward cap, issues the referrer a
//        single-use reward coupon and marks REWARDED; else VOID (cap reason)
//
//  Rewards are single-use Coupons (perUserLimit = 1, usageLimit = 1) so the
//  existing coupon engine handles redemption / expiry / one-time use.
// ──────────────────────────────────────────────

const prisma = require('../config/database');
const { logger } = require('../config/logger');

const CONFIG_KEY = 'REFERRAL_PROGRAM_CONFIG';

const DEFAULT_CONFIG = {
    enabled: true,
    discountType: 'flat', // 'flat' | 'percentage'
    referrerRewardValue: 100, // reward to the person who shared the code
    refereeRewardValue: 100, // welcome discount for the new user
    maxRewardsPerReferrer: 20, // lifetime cap on REWARDED referrals per referrer
    rewardValidityDays: 60, // coupon validity from issue date
    minFirstOrderValue: 0, // referee's first order must be at least this to qualify
};

async function getReferralConfig() {
    let row = await prisma.uIConfig.findUnique({ where: { key: CONFIG_KEY } });
    if (!row) {
        row = await prisma.uIConfig.create({
            data: { key: CONFIG_KEY, label: 'Referral Program', configJson: DEFAULT_CONFIG },
        });
    }
    return { ...DEFAULT_CONFIG, ...(row.configJson || {}) };
}

// AYX + 6 chars from a Crockford-ish base32 alphabet (no I/O/0/1 confusion).
const ALPHABET = 'ABCDEFGHJKMNPQRSTVWXYZ23456789';
function randomCode() {
    let s = 'AYX';
    for (let i = 0; i < 6; i++) s += ALPHABET[Math.floor(Math.random() * ALPHABET.length)];
    return s;
}

// Generate a code guaranteed unique against the users table.
async function generateReferralCode() {
    for (let i = 0; i < 6; i++) {
        const code = randomCode();
        const clash = await prisma.user.findUnique({ where: { referralCode: code }, select: { id: true } });
        if (!clash) return code;
    }
    // Fall back to a longer code — collision after 6 tries is effectively impossible,
    // but never hand back a dup.
    return randomCode() + Date.now().toString(36).toUpperCase().slice(-3);
}

// Issue a single-use coupon. Returns the created Coupon.
async function issueRewardCoupon(tx, { prefix, userId, discountType, discountValue, validityDays }) {
    const db = tx || prisma;
    // Unique, unguessable code so it can't be brute-forced onto another account.
    let code;
    for (let i = 0; i < 6; i++) {
        code = `${prefix}${randomCode().slice(3)}${Math.floor(Math.random() * 900 + 100)}`;
        const clash = await db.coupon.findUnique({ where: { code }, select: { id: true } });
        if (!clash) break;
    }
    const validUntil = new Date();
    validUntil.setDate(validUntil.getDate() + (validityDays || 60));

    return db.coupon.create({
        data: {
            code,
            description: prefix === 'REF' ? 'Referral reward' : 'Welcome bonus (referral)',
            discountType,
            discountValue,
            usageLimit: 1,
            perUserLimit: 1,
            isActive: true,
            validUntil,
        },
    });
}

/**
 * Called from createUser when a new user supplies a referral code.
 * Best-effort: never throws — a bad code just means "no referral".
 * @returns {Promise<{ linked: boolean, refereeCouponCode?: string, reason?: string }>}
 */
async function linkReferralAtSignup({ refereeUserId, refereePhone, code }) {
    try {
        if (!code) return { linked: false };
        const cfg = await getReferralConfig();
        if (!cfg.enabled) return { linked: false, reason: 'Program disabled' };

        const referrer = await prisma.user.findUnique({
            where: { referralCode: String(code).trim().toUpperCase() },
            select: { id: true, phone: true, status: true },
        });
        if (!referrer) return { linked: false, reason: 'Invalid code' };
        if (referrer.id === refereeUserId) return { linked: false, reason: 'Self-referral' };
        if (referrer.phone === refereePhone) return { linked: false, reason: 'Self-referral (phone)' };
        if (referrer.status !== 'ACTIVE') return { linked: false, reason: 'Referrer inactive' };

        // A user can be referred at most once (schema: Referral.refereeId @unique +
        // User.referredById set once). Guard here too for a clean message.
        const existing = await prisma.referral.findUnique({ where: { refereeId: refereeUserId } });
        if (existing) return { linked: false, reason: 'Already referred' };

        const result = await prisma.$transaction(async (tx) => {
            const refereeCoupon = cfg.refereeRewardValue > 0
                ? await issueRewardCoupon(tx, {
                    prefix: 'WEL',
                    userId: refereeUserId,
                    discountType: cfg.discountType,
                    discountValue: cfg.refereeRewardValue,
                    validityDays: cfg.rewardValidityDays,
                })
                : null;

            await tx.user.update({
                where: { id: refereeUserId },
                data: { referredById: referrer.id },
            });

            await tx.referral.create({
                data: {
                    referrerId: referrer.id,
                    refereeId: refereeUserId,
                    status: 'PENDING',
                    codeUsed: String(code).trim().toUpperCase(),
                    refereeCouponId: refereeCoupon?.id || null,
                    rewardValue: cfg.referrerRewardValue,
                },
            });

            return { refereeCouponCode: refereeCoupon?.code };
        });

        logger.info(`[Referral] ${refereeUserId} linked to referrer ${referrer.id} via ${code}`);
        return { linked: true, refereeCouponCode: result.refereeCouponCode };
    } catch (err) {
        logger.warn('[Referral] linkReferralAtSignup failed:', err.message);
        return { linked: false, reason: 'error' };
    }
}

/**
 * Called from processPaymentSuccess after a payment is confirmed SUCCESS.
 * Idempotent: safe to call for every payment; only acts on a PENDING referral
 * whose referee is this payer and whose first qualifying order this is.
 * Runs OUTSIDE the payment transaction (best-effort, must not block the payment).
 */
async function qualifyReferralForPayment({ payerUserId, paymentId, paidAmount }) {
    try {
        const referral = await prisma.referral.findUnique({
            where: { refereeId: payerUserId },
        });
        if (!referral || referral.status !== 'PENDING') return;

        const cfg = await getReferralConfig();
        if (cfg.minFirstOrderValue > 0 && Number(paidAmount) < cfg.minFirstOrderValue) {
            logger.info(`[Referral] ${referral.id} payment below minFirstOrderValue — still PENDING`);
            return;
        }

        // Referrer cap check.
        const rewardedCount = await prisma.referral.count({
            where: { referrerId: referral.referrerId, status: 'REWARDED' },
        });

        if (!cfg.enabled) {
            await prisma.referral.update({
                where: { id: referral.id },
                data: { status: 'VOID', voidReason: 'Program disabled at qualify time', qualifiedAt: new Date() },
            });
            return;
        }

        if (rewardedCount >= cfg.maxRewardsPerReferrer) {
            await prisma.referral.update({
                where: { id: referral.id },
                data: {
                    status: 'VOID',
                    voidReason: `Referrer reached cap (${cfg.maxRewardsPerReferrer})`,
                    refereePaymentId: paymentId,
                    qualifiedAt: new Date(),
                },
            });
            logger.info(`[Referral] ${referral.id} VOID — referrer ${referral.referrerId} at cap`);
            return;
        }

        await prisma.$transaction(async (tx) => {
            const referrerCoupon = cfg.referrerRewardValue > 0
                ? await issueRewardCoupon(tx, {
                    prefix: 'REF',
                    userId: referral.referrerId,
                    discountType: cfg.discountType,
                    discountValue: cfg.referrerRewardValue,
                    validityDays: cfg.rewardValidityDays,
                })
                : null;

            await tx.referral.update({
                where: { id: referral.id },
                data: {
                    status: 'REWARDED',
                    refereePaymentId: paymentId,
                    referrerCouponId: referrerCoupon?.id || null,
                    rewardValue: cfg.referrerRewardValue,
                    qualifiedAt: new Date(),
                    rewardedAt: new Date(),
                },
            });
        });

        logger.info(`[Referral] ${referral.id} REWARDED — referrer ${referral.referrerId}`);
    } catch (err) {
        logger.warn('[Referral] qualifyReferralForPayment failed:', err.message);
    }
}

module.exports = {
    CONFIG_KEY,
    DEFAULT_CONFIG,
    getReferralConfig,
    generateReferralCode,
    linkReferralAtSignup,
    qualifyReferralForPayment,
};
