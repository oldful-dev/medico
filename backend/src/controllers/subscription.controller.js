// ──────────────────────────────────────────────
//  Subscription Management Controller
// ──────────────────────────────────────────────

const prisma = require('../config/database');
const { sendResponse, sendPaginatedResponse, paginate, calculateExpiryDate } = require('../utils/helpers');

// GET /api/subscriptions
const getSubscriptions = async (req, res, next) => {
    try {
        const { page, limit, skip } = paginate(req.query);
        const { status, planId, userId, search } = req.query;

        const where = {};
        if (status) where.status = status;
        if (planId) where.planId = planId;
        if (userId) where.userId = userId;
        if (search) {
            where.user = { name: { contains: search, mode: 'insensitive' } };
        }

        const [subscriptions, total] = await Promise.all([
            prisma.subscription.findMany({
                where,
                skip,
                take: limit,
                include: {
                    user: { select: { id: true, name: true, uniqueUserId: true, phone: true } },
                    plan: true,
                },
                orderBy: { createdAt: 'desc' },
            }),
            prisma.subscription.count({ where }),
        ]);

        sendPaginatedResponse(res, subscriptions, total, page, limit);
    } catch (error) {
        next(error);
    }
};

// POST /api/subscriptions
const createSubscription = async (req, res, next) => {
    try {
        const { userId, planId, billingCycle, startDate, amount, autoRenew } = req.body;
        const start = new Date(startDate || Date.now());
        const expiryDate = calculateExpiryDate(start, billingCycle);

        const subscription = await prisma.subscription.create({
            data: {
                userId,
                planId,
                billingCycle,
                startDate: start,
                expiryDate,
                amount,
                autoRenew: autoRenew || false,
            },
            include: { plan: true, user: { select: { name: true } } },
        });

        sendResponse(res, 201, subscription, 'Subscription activated');
    } catch (error) {
        next(error);
    }
};

// PUT /api/subscriptions/:id/pause
const pauseSubscription = async (req, res, next) => {
    try {
        const subscription = await prisma.subscription.update({
            where: { id: req.params.id },
            data: { status: 'PAUSED', pausedAt: new Date() },
        });
        sendResponse(res, 200, subscription, 'Subscription paused');
    } catch (error) {
        next(error);
    }
};

// PUT /api/subscriptions/:id/resume
const resumeSubscription = async (req, res, next) => {
    try {
        const subscription = await prisma.subscription.update({
            where: { id: req.params.id },
            data: { status: 'ACTIVE', resumedAt: new Date() },
        });
        sendResponse(res, 200, subscription, 'Subscription resumed');
    } catch (error) {
        next(error);
    }
};

// PUT /api/subscriptions/:id/extend
const extendSubscription = async (req, res, next) => {
    try {
        const { extraDays } = req.body;
        const sub = await prisma.subscription.findUnique({ where: { id: req.params.id } });
        const newExpiry = new Date(sub.expiryDate);
        newExpiry.setDate(newExpiry.getDate() + (extraDays || 0));

        const subscription = await prisma.subscription.update({
            where: { id: req.params.id },
            data: { expiryDate: newExpiry, status: 'ACTIVE' },
        });
        sendResponse(res, 200, subscription, 'Subscription extended');
    } catch (error) {
        next(error);
    }
};

// PUT /api/subscriptions/:id/cancel
const cancelSubscription = async (req, res, next) => {
    try {
        const subscription = await prisma.subscription.update({
            where: { id: req.params.id },
            data: { status: 'CANCELLED', cancelledAt: new Date() },
        });
        sendResponse(res, 200, subscription, 'Subscription cancelled');
    } catch (error) {
        next(error);
    }
};

// PUT /api/subscriptions/:id/auto-renew
const toggleAutoRenew = async (req, res, next) => {
    try {
        const sub = await prisma.subscription.findUnique({ where: { id: req.params.id } });
        const subscription = await prisma.subscription.update({
            where: { id: req.params.id },
            data: { autoRenew: !sub.autoRenew },
        });
        sendResponse(res, 200, subscription, `Auto-renew ${subscription.autoRenew ? 'enabled' : 'disabled'}`);
    } catch (error) {
        next(error);
    }
};

// PUT /api/subscriptions/:id/compassionate
const compassionateExtension = async (req, res, next) => {
    try {
        const { days, reason } = req.body;
        const sub = await prisma.subscription.findUnique({ where: { id: req.params.id } });

        const newExpiry = new Date(sub.expiryDate);
        newExpiry.setDate(newExpiry.getDate() + days);

        const subscription = await prisma.subscription.update({
            where: { id: req.params.id },
            data: {
                expiryDate: newExpiry,
                compassionateExtensionDays: sub.compassionateExtensionDays + days,
                compassionateReason: reason,
                status: 'ACTIVE',
            },
        });
        sendResponse(res, 200, subscription, 'Compassionate extension applied');
    } catch (error) {
        next(error);
    }
};

module.exports = {
    getSubscriptions, createSubscription,
    pauseSubscription, resumeSubscription, extendSubscription,
    cancelSubscription, toggleAutoRenew, compassionateExtension,
};
