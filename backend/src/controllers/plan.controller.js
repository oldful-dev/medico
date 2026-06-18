// ──────────────────────────────────────────────
//  Plan & Subscription Controllers
// ──────────────────────────────────────────────

const prisma = require('../config/database');
const { sendResponse, sendPaginatedResponse, paginate, calculateExpiryDate } = require('../utils/helpers');
const { createAuditLog } = require('../middleware/audit');

// ═══════════════════════════════════════════
//  PLAN CRUD
// ═══════════════════════════════════════════

// Helper to auto-expand Companion benefits with Lifeline benefits
const expandPlanBenefits = async (plan) => {
    if (!plan) return plan;
    const planName = plan.name || '';
    const metadata = plan.metadata || {};
    const isCompanion = planName.toUpperCase().includes('COMPANION') || (metadata && metadata.code === 'COMPANION');
    if (!isCompanion) return plan;

    const lifelinePlan = await prisma.plan.findFirst({
        where: {
            OR: [
                { name: { contains: 'Lifeline', mode: 'insensitive' } },
                { name: { contains: 'Care Plan', mode: 'insensitive' } }
            ]
        },
        include: {
            planBenefits: { orderBy: { displayOrder: 'asc' } }
        }
    });

    if (lifelinePlan && lifelinePlan.planBenefits && lifelinePlan.planBenefits.length > 0) {
        const inheritedBenefits = lifelinePlan.planBenefits.map(b => ({
            ...b,
            id: `inherited-${b.id}`,
            planId: plan.id,
        }));
        plan.planBenefits = [...inheritedBenefits, ...(plan.planBenefits || [])];
    }
    return plan;
};

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
        let plan = await prisma.plan.findUnique({
            where: { id: req.params.id },
            include: {
                planBenefits: { orderBy: { displayOrder: 'asc' } },
                billingCycles: true,
                subscriptions: {
                    take: 10,
                    orderBy: { createdAt: 'desc' },
                    include: { user: { select: { name: true, uniqueUserId: true } } },
                },
                _count: { select: { subscriptions: true } },
            },
        });
        if (!plan) return res.status(404).json({ success: false, message: 'Plan not found' });
        plan = await expandPlanBenefits(plan);
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
            orderBy: [{ planType: 'asc' }, { sortOrder: 'asc' }],
            include: {
                planBenefits: { orderBy: { displayOrder: 'asc' } },
                _count: { select: { subscriptions: true } },
            },
        });
        sendResponse(res, 200, plans);
    } catch (error) {
        next(error);
    }
};

// GET /api/plans/by-category/:planType  (public)
// Returns all visible plans of a given planType ordered by sortOrder asc.
// Response includes structured planBenefits (V2) + billingCycles.
const getPlansByType = async (req, res, next) => {
    try {
        const { planType } = req.params;
        const validTypes = ['CARE', 'HOMEMAKER'];
        if (!validTypes.includes(planType?.toUpperCase())) {
            return res.status(400).json({ success: false, message: 'Invalid plan type. Use CARE or HOMEMAKER.' });
        }
        const plans = await prisma.plan.findMany({
            where: { planType: planType.toUpperCase(), isVisible: true },
            orderBy: { sortOrder: 'asc' },
            include: {
                planBenefits: { orderBy: { displayOrder: 'asc' } },
                billingCycles: true,
            },
        });
        const expandedPlans = await Promise.all(plans.map(p => expandPlanBenefits(p)));
        sendResponse(res, 200, expandedPlans);
    } catch (error) {
        next(error);
    }
};

// ═══════════════════════════════════════════
//  PLAN BENEFIT CRUD  (admin only)
// ═══════════════════════════════════════════

// GET /api/plans/:id/benefits
const getPlanBenefits = async (req, res, next) => {
    try {
        const benefits = await prisma.planBenefit.findMany({
            where: { planId: req.params.id },
            orderBy: { displayOrder: 'asc' },
        });
        sendResponse(res, 200, benefits);
    } catch (error) {
        next(error);
    }
};

// POST /api/plans/:id/benefits
const addPlanBenefit = async (req, res, next) => {
    try {
        const { benefitCode, title, description, usageLimit, usagePeriod, displayOrder } = req.body;

        if (!benefitCode || !title) {
            return res.status(400).json({ success: false, message: 'benefitCode and title are required.' });
        }

        const benefit = await prisma.planBenefit.create({
            data: {
                planId: req.params.id,
                benefitCode: String(benefitCode).toUpperCase(),
                title: String(title),
                description: description || null,
                usageLimit: parseInt(usageLimit) || 0,
                usagePeriod: usagePeriod || 'MONTH',
                displayOrder: parseInt(displayOrder) || 0,
                // legacy compat
                serviceCategory: String(benefitCode).toUpperCase(),
                freeCount: parseInt(usageLimit) || 0,
            },
        });
        sendResponse(res, 201, benefit, 'Benefit added');
    } catch (error) {
        next(error);
    }
};

// PUT /api/plans/:id/benefits/:benefitId
const updatePlanBenefit = async (req, res, next) => {
    try {
        const { benefitCode, title, description, usageLimit, usagePeriod, displayOrder } = req.body;

        const existing = await prisma.planBenefit.findFirst({
            where: { id: req.params.benefitId, planId: req.params.id },
        });
        if (!existing) return res.status(404).json({ success: false, message: 'Benefit not found.' });

        const data = {};
        if (benefitCode !== undefined) {
            data.benefitCode = String(benefitCode).toUpperCase();
            data.serviceCategory = String(benefitCode).toUpperCase();
        }
        if (title !== undefined) data.title = String(title);
        if (description !== undefined) data.description = description || null;
        if (usageLimit !== undefined) { data.usageLimit = parseInt(usageLimit) || 0; data.freeCount = parseInt(usageLimit) || 0; }
        if (usagePeriod !== undefined) data.usagePeriod = usagePeriod;
        if (displayOrder !== undefined) data.displayOrder = parseInt(displayOrder) || 0;

        const benefit = await prisma.planBenefit.update({
            where: { id: req.params.benefitId },
            data,
        });
        sendResponse(res, 200, benefit, 'Benefit updated');
    } catch (error) {
        next(error);
    }
};

// DELETE /api/plans/:id/benefits/:benefitId
const deletePlanBenefit = async (req, res, next) => {
    try {
        const existing = await prisma.planBenefit.findFirst({
            where: { id: req.params.benefitId, planId: req.params.id },
        });
        if (!existing) return res.status(404).json({ success: false, message: 'Benefit not found.' });

        await prisma.planBenefit.delete({ where: { id: req.params.benefitId } });
        sendResponse(res, 200, null, 'Benefit deleted');
    } catch (error) {
        next(error);
    }
};

module.exports = {
    getPlans,
    getPlanById,
    createPlan,
    updatePlan,
    deletePlan,
    getAllPlansAdmin,
    getPlansByType,
    getPlanBenefits,
    addPlanBenefit,
    updatePlanBenefit,
    deletePlanBenefit,
};
