// ──────────────────────────────────────────────
//  Subscription Management Controller
// ──────────────────────────────────────────────

const prisma = require('../config/database');
const { sendResponse, sendPaginatedResponse, paginate, calculateExpiryDate } = require('../utils/helpers');
const { logger } = require('../config/logger');

// GET /api/subscriptions
const getSubscriptions = async (req, res, next) => {
    try {
        const { page, limit, skip } = paginate(req.query);
        const { status, planId, userId, search } = req.query;

        const where = {};
        if (req.cityFilter) {
            where.user = { cityId: req.cityFilter };
        }
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
        const { userId, planId, billingCycle, startDate, amount, autoRenew, status } = req.body;
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
                status: status || 'ACTIVE',
            },
            include: { plan: true, user: { select: { name: true } } },
        });

        sendResponse(res, 201, subscription, 'Subscription activated');
    } catch (error) {
        next(error);
    }
};

// POST /api/subscriptions/initiate (User authenticated)
const initiateUserSubscription = async (req, res, next) => {
    try {
        const { planId, billingCycle, amount } = req.body;
        const userId = req.user.id;
        
        const start = new Date();
        const expiryDate = calculateExpiryDate(start, billingCycle);

        const subscription = await prisma.subscription.create({
            data: {
                userId,
                planId,
                billingCycle,
                startDate: start,
                expiryDate,
                amount,
                status: 'PAYMENT_PENDING',
            },
        });

        sendResponse(res, 201, subscription, 'Subscription initiated');
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
            include: { user: { select: { id: true, name: true, phone: true, uniqueUserId: true, smsEnabled: true } }, plan: true },
        });

        // Notify user of plan cancellation — non-fatal
        try {
            if (subscription.user?.phone) {
                const { sendSMS } = require('../services/sms');
                const supportPhone = process.env.SUPPORT_PHONE || '9480198108';
                // DLT SMS 215602: PLAN_CANCELLED_WITH_CONTACT — Var1=name, Var2=support
                await sendSMS({
                    template: 'PLAN_CANCELLED_WITH_CONTACT',
                    mobile: subscription.user.phone,
                    variables: [subscription.user.name, supportPhone],
                });
                // WA: notify family emergency contacts (AYUXA_FAMILY — PLAN_EXPIRED_FAMILY)
                const { sendPlanExpiredFamily } = require('../services/whatsapp');
                const contacts = await prisma.emergencyContact.findMany({ where: { userId: subscription.userId } });
                for (const contact of contacts) {
                    await sendPlanExpiredFamily({
                        phone: contact.phone,
                        familyName: contact.name,
                        clientName: subscription.user.name,
                        ayuxaId: subscription.user.uniqueUserId || subscription.userId,
                    }).catch(() => {});
                }
            }
        } catch (notifErr) {
            logger.warn('cancelSubscription: notification failed (non-fatal):', notifErr.message);
        }

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

// POST /api/subscriptions/verify (User authenticated)
const verifyUserSubscription = async (req, res, next) => {
    try {
        const { subscriptionId, razorpayPaymentId, razorpaySignature } = req.body;
        // In reality, you verify the razorpay signature here using crypto

        const subscription = await prisma.subscription.update({
            where: { id: subscriptionId },
            data: { status: 'ACTIVE' },
            include: { plan: { include: { planBenefits: true } } }
        });

        // Initialize benefits for the user based on planBenefits
        const usageData = subscription.plan.planBenefits.map(benefit => ({
            subscriptionId: subscription.id,
            serviceCategory: benefit.serviceCategory,
            totalAllocated: benefit.freeCount,
            usedCount: 0,
            lockedCount: 0
        }));

        if (usageData.length > 0) {
            await prisma.subscriptionUsage.createMany({
                data: usageData
            });
        }

        sendResponse(res, 200, subscription, 'Subscription activated successfully');
    } catch (error) {
        next(error);
    }
};

// GET /api/subscriptions/me/active (User authenticated)
// Check if user has an active subscription that covers booking fees
const checkUserActiveSubscription = async (req, res, next) => {
    try {
        const userId = req.user.id;
        const activeSub = await prisma.subscription.findFirst({
            where: {
                userId,
                status: 'ACTIVE',
                expiryDate: { gte: new Date() },
            },
            include: {
                plan: { select: { name: true } },
            },
        });

        if (activeSub) {
            return sendResponse(res, 200, {
                hasActiveSubscription: true,
                subscription: {
                    id: activeSub.id,
                    planName: activeSub.plan?.name,
                    expiryDate: activeSub.expiryDate,
                    autoRenew: activeSub.autoRenew,
                },
                message: 'All services are free with your active subscription',
            });
        }

        sendResponse(res, 200, {
            hasActiveSubscription: false,
            message: 'No active subscription. Regular charges will apply.',
        });
    } catch (error) {
        next(error);
    }
};

module.exports = {
    getSubscriptions, createSubscription, initiateUserSubscription, verifyUserSubscription,
    pauseSubscription, resumeSubscription, extendSubscription,
    cancelSubscription, toggleAutoRenew, compassionateExtension,
    checkUserActiveSubscription,
};
