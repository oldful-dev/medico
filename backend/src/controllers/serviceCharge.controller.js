// ──────────────────────────────────────────────
//  AYUXA Service Charge Management Controller
// ──────────────────────────────────────────────

const prisma = require('../config/database');
const { sendResponse } = require('../utils/helpers');

// GET /api/admin/service-charges
const getServiceCharges = async (req, res, next) => {
    try {
        const charges = await prisma.serviceCharge.findMany({
            orderBy: { serviceCategory: 'asc' },
        });
        sendResponse(res, 200, charges);
    } catch (error) {
        next(error);
    }
};

// GET /api/admin/service-charges/:id
const getServiceChargeById = async (req, res, next) => {
    try {
        const charge = await prisma.serviceCharge.findUnique({
            where: { id: req.params.id },
        });
        if (!charge) return res.status(404).json({ success: false, message: 'Service charge configuration not found' });
        sendResponse(res, 200, charge);
    } catch (error) {
        next(error);
    }
};

// POST /api/admin/service-charges
const createServiceCharge = async (req, res, next) => {
    try {
        const {
            serviceCategory,
            bookingFee,
            platformFee,
            convenienceFee,
            emergencyFee,
            visitFee,
            nightCharge,
            surgeCharge,
            taxPercentage,
            isSubscriptionEligible,
            isActive
        } = req.body;

        const existing = await prisma.serviceCharge.findUnique({
            where: { serviceCategory }
        });
        if (existing) {
            return res.status(400).json({ success: false, message: `Configuration for ${serviceCategory} already exists.` });
        }

        const charge = await prisma.serviceCharge.create({
            data: {
                serviceCategory,
                bookingFee: parseFloat(bookingFee || 0),
                platformFee: parseFloat(platformFee || 0),
                convenienceFee: parseFloat(convenienceFee || 0),
                emergencyFee: parseFloat(emergencyFee || 0),
                visitFee: parseFloat(visitFee || 0),
                nightCharge: parseFloat(nightCharge || 0),
                surgeCharge: parseFloat(surgeCharge || 0),
                taxPercentage: parseFloat(taxPercentage || 0),
                isSubscriptionEligible: isSubscriptionEligible !== undefined ? isSubscriptionEligible : true,
                isActive: isActive !== undefined ? isActive : true,
            },
        });
        sendResponse(res, 201, charge, 'Service charge configuration created successfully');
    } catch (error) {
        next(error);
    }
};

// PUT /api/admin/service-charges/:id
const updateServiceCharge = async (req, res, next) => {
    try {
        const {
            bookingFee,
            platformFee,
            convenienceFee,
            emergencyFee,
            visitFee,
            nightCharge,
            surgeCharge,
            taxPercentage,
            isSubscriptionEligible,
            isActive
        } = req.body;

        const data = {};
        if (bookingFee !== undefined) data.bookingFee = parseFloat(bookingFee);
        if (platformFee !== undefined) data.platformFee = parseFloat(platformFee);
        if (convenienceFee !== undefined) data.convenienceFee = parseFloat(convenienceFee);
        if (emergencyFee !== undefined) data.emergencyFee = parseFloat(emergencyFee);
        if (visitFee !== undefined) data.visitFee = parseFloat(visitFee);
        if (nightCharge !== undefined) data.nightCharge = parseFloat(nightCharge);
        if (surgeCharge !== undefined) data.surgeCharge = parseFloat(surgeCharge);
        if (taxPercentage !== undefined) data.taxPercentage = parseFloat(taxPercentage);
        if (isSubscriptionEligible !== undefined) data.isSubscriptionEligible = isSubscriptionEligible;
        if (isActive !== undefined) data.isActive = isActive;

        const charge = await prisma.serviceCharge.update({
            where: { id: req.params.id },
            data,
        });
        sendResponse(res, 200, charge, 'Service charge configuration updated successfully');
    } catch (error) {
        next(error);
    }
};

// DELETE /api/admin/service-charges/:id
const deleteServiceCharge = async (req, res, next) => {
    try {
        await prisma.serviceCharge.delete({
            where: { id: req.params.id }
        });
        sendResponse(res, 200, null, 'Service charge configuration deleted successfully');
    } catch (error) {
        next(error);
    }
};

module.exports = {
    getServiceCharges,
    getServiceChargeById,
    createServiceCharge,
    updateServiceCharge,
    deleteServiceCharge,
};
