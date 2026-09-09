// ──────────────────────────────────────────────
//  Coupon / Promotions Controller (admin)
//
//  Customer-facing validation lives in utils/couponValidator.js and is called
//  from payment.controller. This file is CRUD only.
// ──────────────────────────────────────────────

const prisma = require('../config/database');
const { sendResponse, paginate, sendPaginatedResponse } = require('../utils/helpers');

const DISCOUNT_TYPES = ['percentage', 'flat'];

// Normalise + validate the writable fields for create/update.
function parseBody(body, { partial = false } = {}) {
    const out = {};
    const err = (m) => { const e = new Error(m); e.status = 400; throw e; };

    if (body.code !== undefined) {
        const code = String(body.code).trim().toUpperCase();
        if (!code) err('Code is required');
        if (!/^[A-Z0-9_-]{3,32}$/.test(code)) err('Code must be 3-32 chars: A-Z, 0-9, - or _');
        out.code = code;
    } else if (!partial) err('Code is required');

    if (body.description !== undefined) out.description = body.description ? String(body.description) : null;

    if (body.discountType !== undefined) {
        if (!DISCOUNT_TYPES.includes(body.discountType)) err(`discountType must be one of ${DISCOUNT_TYPES.join(', ')}`);
        out.discountType = body.discountType;
    }

    if (body.discountValue !== undefined) {
        const v = Number(body.discountValue);
        if (!Number.isFinite(v) || v <= 0) err('discountValue must be greater than 0');
        const type = out.discountType || body.discountType;
        if (type === 'percentage' && v > 100) err('A percentage discount cannot exceed 100');
        out.discountValue = v;
    } else if (!partial) err('discountValue is required');

    for (const f of ['maxDiscount', 'minOrderValue']) {
        if (body[f] !== undefined) {
            if (body[f] === null || body[f] === '') { out[f] = null; continue; }
            const v = Number(body[f]);
            if (!Number.isFinite(v) || v < 0) err(`${f} must be a non-negative number`);
            out[f] = v;
        }
    }

    for (const f of ['usageLimit', 'perUserLimit']) {
        if (body[f] !== undefined) {
            if (body[f] === null || body[f] === '') { out[f] = null; continue; }
            const v = Number(body[f]);
            if (!Number.isInteger(v) || v < 1) err(`${f} must be a positive whole number`);
            out[f] = v;
        }
    }

    if (body.isActive !== undefined) out.isActive = !!body.isActive;

    for (const f of ['validFrom', 'validUntil']) {
        if (body[f] !== undefined) {
            if (body[f] === null || body[f] === '') { out[f] = f === 'validFrom' ? undefined : null; continue; }
            const d = new Date(body[f]);
            if (Number.isNaN(d.getTime())) err(`${f} is not a valid date`);
            out[f] = d;
        }
    }
    if (out.validFrom && out.validUntil && out.validUntil <= out.validFrom) {
        err('validUntil must be after validFrom');
    }

    return out;
}

// GET /api/admin/coupons
const listCoupons = async (req, res, next) => {
    try {
        const { page, limit, skip } = paginate(req.query);
        const { search, isActive } = req.query;

        // System-issued reward coupons (referral welcome/bonus) are locked to one
        // user and managed by the referral program — keep them out of this list.
        const where = { reservedForUserId: null };
        if (isActive !== undefined) where.isActive = isActive === 'true';
        if (search) {
            where.OR = [
                { code: { contains: search, mode: 'insensitive' } },
                { description: { contains: search, mode: 'insensitive' } },
            ];
        }

        const [coupons, total] = await Promise.all([
            prisma.coupon.findMany({
                where,
                skip,
                take: limit,
                orderBy: { createdAt: 'desc' },
                include: { _count: { select: { redemptions: true } } },
            }),
            prisma.coupon.count({ where }),
        ]);

        sendPaginatedResponse(res, coupons, total, page, limit);
    } catch (error) {
        next(error);
    }
};

// GET /api/admin/coupons/:id
const getCoupon = async (req, res, next) => {
    try {
        const coupon = await prisma.coupon.findUnique({
            where: { id: req.params.id },
            include: {
                _count: { select: { redemptions: true } },
                redemptions: {
                    take: 20,
                    orderBy: { createdAt: 'desc' },
                    include: { user: { select: { name: true, phone: true } } },
                },
            },
        });
        if (!coupon) return res.status(404).json({ success: false, message: 'Coupon not found' });
        sendResponse(res, 200, coupon);
    } catch (error) {
        next(error);
    }
};

// POST /api/admin/coupons
const createCoupon = async (req, res, next) => {
    try {
        const data = parseBody(req.body);
        const existing = await prisma.coupon.findUnique({ where: { code: data.code } });
        if (existing) return res.status(409).json({ success: false, message: 'A coupon with this code already exists' });

        const coupon = await prisma.coupon.create({ data });
        sendResponse(res, 201, coupon, 'Coupon created');
    } catch (error) {
        if (error.status === 400) return res.status(400).json({ success: false, message: error.message });
        next(error);
    }
};

// PUT /api/admin/coupons/:id
const updateCoupon = async (req, res, next) => {
    try {
        const target = await prisma.coupon.findUnique({ where: { id: req.params.id }, select: { reservedForUserId: true } });
        if (target?.reservedForUserId) {
            return res.status(403).json({ success: false, message: 'This is a system-issued reward coupon and cannot be edited here.' });
        }
        const data = parseBody(req.body, { partial: true });
        if (data.code) {
            const clash = await prisma.coupon.findFirst({
                where: { code: data.code, NOT: { id: req.params.id } },
            });
            if (clash) return res.status(409).json({ success: false, message: 'A coupon with this code already exists' });
        }
        const coupon = await prisma.coupon.update({ where: { id: req.params.id }, data });
        sendResponse(res, 200, coupon, 'Coupon updated');
    } catch (error) {
        if (error.status === 400) return res.status(400).json({ success: false, message: error.message });
        if (error.code === 'P2025') return res.status(404).json({ success: false, message: 'Coupon not found' });
        next(error);
    }
};

// DELETE /api/admin/coupons/:id
// Soft: if it has been redeemed, just deactivate (keep the ledger intact).
const deleteCoupon = async (req, res, next) => {
    try {
        const target = await prisma.coupon.findUnique({ where: { id: req.params.id }, select: { reservedForUserId: true } });
        if (target?.reservedForUserId) {
            return res.status(403).json({ success: false, message: 'This is a system-issued reward coupon and cannot be deleted here.' });
        }
        const redemptions = await prisma.couponRedemption.count({ where: { couponId: req.params.id } });
        if (redemptions > 0) {
            const coupon = await prisma.coupon.update({
                where: { id: req.params.id },
                data: { isActive: false },
            });
            return sendResponse(res, 200, coupon, 'Coupon has redemptions — deactivated instead of deleted');
        }
        await prisma.coupon.delete({ where: { id: req.params.id } });
        sendResponse(res, 200, null, 'Coupon deleted');
    } catch (error) {
        if (error.code === 'P2025') return res.status(404).json({ success: false, message: 'Coupon not found' });
        next(error);
    }
};

module.exports = { listCoupons, getCoupon, createCoupon, updateCoupon, deleteCoupon };
