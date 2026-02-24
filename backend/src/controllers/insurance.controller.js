// ──────────────────────────────────────────────
//  Insurance Controller
// ──────────────────────────────────────────────

const prisma = require('../config/database');
const { sendResponse, sendPaginatedResponse, paginate } = require('../utils/helpers');

// GET /api/insurance/plans
const getInsurancePlans = async (req, res, next) => {
    try {
        // For now, return from plans table or static data
        // This could be a separate InsurancePlan model in future
        sendResponse(res, 200, [
            { id: 'ins-basic', name: 'Medico Shield Basic', coverage: '₹5L', premium: 199, features: ['Hospitalization', 'OPD Cover'], eligibility: ['Age 55-75'], exclusions: ['Pre-existing (2yr wait)'] },
            { id: 'ins-plus', name: 'Medico Shield Plus', coverage: '₹10L', premium: 399, features: ['Hospitalization', 'OPD', 'Critical Illness'], eligibility: ['Age 55-80'], exclusions: ['Pre-existing (1yr wait)'] },
            { id: 'ins-premium', name: 'Medico Shield Premium', coverage: '₹25L', premium: 799, features: ['All Cover', 'Ayush', 'Home Treatment'], eligibility: ['Age 55-85'], exclusions: ['None after 6mo'] },
        ]);
    } catch (error) {
        next(error);
    }
};

// POST /api/insurance/calculate-premium
const calculatePremium = async (req, res, next) => {
    try {
        const { conditions, age } = req.body;
        let basePremium = 199;
        // Simple premium calculation based on conditions
        if (conditions && conditions.length > 0) {
            basePremium += conditions.length * 50;
        }
        if (age > 70) basePremium += 100;
        if (age > 80) basePremium += 200;

        sendResponse(res, 200, { premium: basePremium });
    } catch (error) {
        next(error);
    }
};

// POST /api/insurance/applications
const submitApplication = async (req, res, next) => {
    try {
        const application = await prisma.insuranceApplication.create({
            data: {
                ...req.body,
                userId: req.body.userId || req.user.id,
                status: 'SUBMITTED',
            },
        });
        sendResponse(res, 201, application, 'Application submitted');
    } catch (error) {
        next(error);
    }
};

// GET /api/insurance/applications
const getApplications = async (req, res, next) => {
    try {
        const { page, limit, skip } = paginate(req.query);
        const { status } = req.query;

        const where = {};
        if (status) where.status = status;

        const [apps, total] = await Promise.all([
            prisma.insuranceApplication.findMany({
                where,
                skip,
                take: limit,
                include: { user: { select: { name: true, uniqueUserId: true } } },
                orderBy: { createdAt: 'desc' },
            }),
            prisma.insuranceApplication.count({ where }),
        ]);

        sendPaginatedResponse(res, apps, total, page, limit);
    } catch (error) {
        next(error);
    }
};

// GET /api/insurance/applications/:id
const getApplicationById = async (req, res, next) => {
    try {
        const app = await prisma.insuranceApplication.findUnique({
            where: { id: req.params.id },
            include: { user: true },
        });
        if (!app) return res.status(404).json({ success: false, message: 'Application not found' });
        sendResponse(res, 200, app);
    } catch (error) {
        next(error);
    }
};

// PUT /api/insurance/applications/:id
const updateApplication = async (req, res, next) => {
    try {
        const app = await prisma.insuranceApplication.update({
            where: { id: req.params.id },
            data: req.body,
        });
        sendResponse(res, 200, app, 'Application updated');
    } catch (error) {
        next(error);
    }
};

module.exports = {
    getInsurancePlans, calculatePremium,
    submitApplication, getApplications, getApplicationById, updateApplication,
};
