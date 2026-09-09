// ──────────────────────────────────────────────
//  Referral Controller
//   User routes  : /api/referrals/me, /api/referrals/validate
//   Admin routes : /api/admin/referrals, /api/admin/referrals/config
// ──────────────────────────────────────────────

const prisma = require('../config/database');
const { sendResponse, paginate, sendPaginatedResponse } = require('../utils/helpers');
const {
    getReferralConfig,
    generateReferralCode,
    CONFIG_KEY,
    DEFAULT_CONFIG,
} = require('../services/referral.service');

// GET /api/referrals/me  — the caller's own code, stats and referred users.
const getMyReferral = async (req, res, next) => {
    try {
        const userId = req.user.id;
        let user = await prisma.user.findUnique({
            where: { id: userId },
            select: { referralCode: true },
        });

        // Older accounts created before the feature may lack a code — mint one now.
        if (!user?.referralCode) {
            const code = await generateReferralCode();
            user = await prisma.user.update({
                where: { id: userId },
                data: { referralCode: code },
                select: { referralCode: true },
            });
        }

        const [config, referrals, myReferral] = await Promise.all([
            getReferralConfig(),
            prisma.referral.findMany({
                where: { referrerId: userId },
                orderBy: { createdAt: 'desc' },
                include: {
                    referee: { select: { name: true } },
                    // Reward coupon so the app can show "you earned CODE".
                },
            }),
            // Was this user themselves referred? Surface their welcome coupon.
            prisma.referral.findUnique({ where: { refereeId: userId } }),
        ]);

        let welcomeCoupon = null;
        if (myReferral?.refereeCouponId) {
            const c = await prisma.coupon.findUnique({
                where: { id: myReferral.refereeCouponId },
                select: { code: true, discountValue: true, discountType: true, validUntil: true, usedCount: true, isActive: true },
            });
            // Only show it while it's still usable.
            if (c && c.isActive && c.usedCount === 0 && (!c.validUntil || new Date(c.validUntil) > new Date())) {
                welcomeCoupon = c;
            }
        }

        const rewardedCount = referrals.filter(r => r.status === 'REWARDED').length;
        const pendingCount = referrals.filter(r => r.status === 'PENDING' || r.status === 'QUALIFIED').length;

        // Attach the referrer coupon codes (only for this user's own rewards).
        const couponIds = referrals.map(r => r.referrerCouponId).filter(Boolean);
        const coupons = couponIds.length
            ? await prisma.coupon.findMany({
                where: { id: { in: couponIds } },
                select: { id: true, code: true, discountValue: true, discountType: true, validUntil: true, usedCount: true, isActive: true },
            })
            : [];
        const couponById = Object.fromEntries(coupons.map(c => [c.id, c]));

        sendResponse(res, 200, {
            referralCode: user.referralCode,
            welcomeCoupon, // set if THIS user was referred and their bonus is unused
            program: {
                enabled: config.enabled,
                referrerRewardValue: config.referrerRewardValue,
                refereeRewardValue: config.refereeRewardValue,
                discountType: config.discountType,
                maxRewardsPerReferrer: config.maxRewardsPerReferrer,
                rewardValidityDays: config.rewardValidityDays,
            },
            stats: {
                total: referrals.length,
                rewarded: rewardedCount,
                pending: pendingCount,
                totalEarned: referrals
                    .filter(r => r.status === 'REWARDED')
                    .reduce((s, r) => s + (r.rewardValue || 0), 0),
                slotsLeft: Math.max(0, config.maxRewardsPerReferrer - rewardedCount),
            },
            referrals: referrals.map(r => ({
                id: r.id,
                refereeName: r.referee?.name || 'New user',
                status: r.status,
                rewardValue: r.rewardValue,
                createdAt: r.createdAt,
                rewardedAt: r.rewardedAt,
                rewardCoupon: r.referrerCouponId ? couponById[r.referrerCouponId] || null : null,
            })),
        });
    } catch (error) {
        next(error);
    }
};

// GET /api/referrals/validate?code=  — pre-check a code at signup (public-ish;
// requires auth on the route but returns only a boolean + reward preview).
const validateCode = async (req, res, next) => {
    try {
        const code = String(req.query.code || '').trim().toUpperCase();
        if (!code) return sendResponse(res, 200, { valid: false });

        const config = await getReferralConfig();
        if (!config.enabled) return sendResponse(res, 200, { valid: false, reason: 'Program not active' });

        const referrer = await prisma.user.findUnique({
            where: { referralCode: code },
            select: { id: true, name: true, status: true },
        });
        if (!referrer || referrer.status !== 'ACTIVE') {
            return sendResponse(res, 200, { valid: false, reason: 'Invalid code' });
        }

        sendResponse(res, 200, {
            valid: true,
            referrerName: referrer.name?.split(' ')[0] || 'A friend',
            refereeReward: config.refereeRewardValue,
            discountType: config.discountType,
        });
    } catch (error) {
        next(error);
    }
};

// ─── Admin ───────────────────────────────────────────────────────────────────

// GET /api/admin/referrals
const listReferrals = async (req, res, next) => {
    try {
        const { page, limit, skip } = paginate(req.query);
        const { status, search } = req.query;

        const where = {};
        if (status) where.status = status;
        if (search) {
            where.OR = [
                { codeUsed: { contains: search, mode: 'insensitive' } },
                { referrer: { name: { contains: search, mode: 'insensitive' } } },
                { referee: { name: { contains: search, mode: 'insensitive' } } },
            ];
        }

        const [rows, total] = await Promise.all([
            prisma.referral.findMany({
                where, skip, take: limit,
                orderBy: { createdAt: 'desc' },
                include: {
                    referrer: { select: { name: true, phone: true, uniqueUserId: true } },
                    referee: { select: { name: true, phone: true, uniqueUserId: true } },
                },
            }),
            prisma.referral.count({ where }),
        ]);

        sendPaginatedResponse(res, rows, total, page, limit);
    } catch (error) {
        next(error);
    }
};

// GET /api/admin/referrals/stats
const getReferralStats = async (req, res, next) => {
    try {
        const [byStatus, totalRewardValue] = await Promise.all([
            prisma.referral.groupBy({ by: ['status'], _count: true }),
            prisma.referral.aggregate({ where: { status: 'REWARDED' }, _sum: { rewardValue: true } }),
        ]);
        const counts = Object.fromEntries(byStatus.map(r => [r.status, r._count]));
        sendResponse(res, 200, {
            pending: counts.PENDING || 0,
            qualified: counts.QUALIFIED || 0,
            rewarded: counts.REWARDED || 0,
            void: counts.VOID || 0,
            totalRewardPaidOut: totalRewardValue._sum.rewardValue || 0,
        });
    } catch (error) {
        next(error);
    }
};

// GET /api/admin/referrals/config
const getConfig = async (req, res, next) => {
    try {
        sendResponse(res, 200, await getReferralConfig());
    } catch (error) {
        next(error);
    }
};

// PUT /api/admin/referrals/config
const updateConfig = async (req, res, next) => {
    try {
        const current = await getReferralConfig();
        const next_ = { ...current };

        const b = req.body;
        if (b.enabled !== undefined) next_.enabled = !!b.enabled;
        if (b.discountType !== undefined) {
            if (!['flat', 'percentage'].includes(b.discountType)) {
                return res.status(400).json({ success: false, message: 'discountType must be flat or percentage' });
            }
            next_.discountType = b.discountType;
        }
        for (const f of ['referrerRewardValue', 'refereeRewardValue', 'minFirstOrderValue']) {
            if (b[f] !== undefined) {
                const v = Number(b[f]);
                if (!Number.isFinite(v) || v < 0) return res.status(400).json({ success: false, message: `${f} must be >= 0` });
                next_[f] = v;
            }
        }
        for (const f of ['maxRewardsPerReferrer', 'rewardValidityDays']) {
            if (b[f] !== undefined) {
                const v = Number(b[f]);
                if (!Number.isInteger(v) || v < 1) return res.status(400).json({ success: false, message: `${f} must be a positive whole number` });
                next_[f] = v;
            }
        }
        if (next_.discountType === 'percentage') {
            if (next_.referrerRewardValue > 100 || next_.refereeRewardValue > 100) {
                return res.status(400).json({ success: false, message: 'Percentage reward cannot exceed 100' });
            }
        }

        const row = await prisma.uIConfig.upsert({
            where: { key: CONFIG_KEY },
            update: { configJson: next_ },
            create: { key: CONFIG_KEY, label: 'Referral Program', configJson: next_ },
        });

        sendResponse(res, 200, { ...DEFAULT_CONFIG, ...(row.configJson || {}) }, 'Referral program updated');
    } catch (error) {
        next(error);
    }
};

module.exports = {
    getMyReferral,
    validateCode,
    listReferrals,
    getReferralStats,
    getConfig,
    updateConfig,
};
