// ──────────────────────────────────────────────
//  Plan & Subscription Controllers
// ──────────────────────────────────────────────

const prisma = require('../config/database');
const { sendResponse, sendPaginatedResponse, paginate, calculateExpiryDate } = require('../utils/helpers');
const { createAuditLog } = require('../middleware/audit');

// ═══════════════════════════════════════════
//  PLAN CRUD
// ═══════════════════════════════════════════

const getPlans = async (req, res, next) => {
    try {
        const plans = await prisma.plan.findMany({
            where: { isVisible: true },
            orderBy: { sortOrder: 'asc' },
            include: { _count: { select: { subscriptions: true } } },
        });
        sendResponse(res, 200, plans);
    } catch (error) {
        next(error);
    }
};

const getPlanById = async (req, res, next) => {
    try {
        const plan = await prisma.plan.findUnique({
            where: { id: req.params.id },
            include: {
                subscriptions: {
                    take: 10,
                    orderBy: { createdAt: 'desc' },
                    include: { user: { select: { name: true, uniqueUserId: true } } },
                },
                _count: { select: { subscriptions: true } },
            },
        });
        if (!plan) return res.status(404).json({ success: false, message: 'Plan not found' });
        sendResponse(res, 200, plan);
    } catch (error) {
        next(error);
    }
};

const createPlan = async (req, res, next) => {
    try {
        const plan = await prisma.plan.create({ data: req.body });
        sendResponse(res, 201, plan, 'Plan created');
    } catch (error) {
        next(error);
    }
};

const updatePlan = async (req, res, next) => {
    try {
        const oldPlan = await prisma.plan.findUnique({ where: { id: req.params.id } });
        const plan = await prisma.plan.update({
            where: { id: req.params.id },
            data: req.body,
        });

        // Audit pricing changes
        if (req.user?.type === 'admin') {
            const priceChanged =
                oldPlan.quarterlyPrice !== plan.quarterlyPrice ||
                oldPlan.biannualPrice !== plan.biannualPrice ||
                oldPlan.yearlyPrice !== plan.yearlyPrice;

            if (priceChanged) {
                await createAuditLog({
                    adminId: req.user.id,
                    action: 'PLAN_PRICE_UPDATED',
                    entity: 'Plan',
                    entityId: plan.id,
                    oldValue: { quarterly: oldPlan.quarterlyPrice, biannual: oldPlan.biannualPrice, yearly: oldPlan.yearlyPrice },
                    newValue: { quarterly: plan.quarterlyPrice, biannual: plan.biannualPrice, yearly: plan.yearlyPrice },
                    ipAddress: req.ip,
                });
            }
        }

        sendResponse(res, 200, plan, 'Plan updated');
    } catch (error) {
        next(error);
    }
};

const deletePlan = async (req, res, next) => {
    try {
        await prisma.plan.delete({ where: { id: req.params.id } });
        sendResponse(res, 200, null, 'Plan deleted');
    } catch (error) {
        next(error);
    }
};

const getAllPlansAdmin = async (req, res, next) => {
    try {
        const plans = await prisma.plan.findMany({
            orderBy: { sortOrder: 'asc' },
            include: { _count: { select: { subscriptions: true } } },
        });
        sendResponse(res, 200, plans);
    } catch (error) {
        next(error);
    }
};

// GET /api/plans/by-category/:planType  (public)
// Returns all visible plans of a given planType ordered by tierLevel asc.
// Used by the inline upsell banner in service-checkout to fetch relevant plans.
const getPlansByType = async (req, res, next) => {
    try {
        const { planType } = req.params;
        const validTypes = ['CARE', 'HOMEMAKER'];
        if (!validTypes.includes(planType?.toUpperCase())) {
            return res.status(400).json({ success: false, message: 'Invalid plan type. Use CARE or HOMEMAKER.' });
        }
        const plans = await prisma.plan.findMany({
            where: { planType: planType.toUpperCase(), isVisible: true },
            orderBy: { tierLevel: 'asc' },
            include: { planBenefits: true, billingCycles: true },
        });
        sendResponse(res, 200, plans);
    } catch (error) {
        next(error);
    }
};

module.exports = { getPlans, getPlanById, createPlan, updatePlan, deletePlan, getAllPlansAdmin, getPlansByType };
