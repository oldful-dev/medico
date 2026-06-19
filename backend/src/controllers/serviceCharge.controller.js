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
            serviceFee,
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
                serviceFee: parseFloat(serviceFee || 0),
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

        // Sync with corresponding Service basePrice
        try {
            const serviceCategoryLower = serviceCategory.toLowerCase().replace(/_/g, '-');
            const service = await prisma.service.findFirst({
                where: {
                    OR: [
                        { slug: serviceCategoryLower },
                        { name: { equals: serviceCategory, mode: 'insensitive' } }
                    ]
                }
            });
            if (service) {
                await prisma.service.update({
                    where: { id: service.id },
                    data: { basePrice: parseFloat(serviceFee || 0) }
                });
            }
        } catch (syncErr) {
            console.error('Failed to sync Service basePrice during creation:', syncErr);
        }

        sendResponse(res, 201, charge, 'Service charge configuration created successfully');
    } catch (error) {
        next(error);
    }
};

// PUT /api/admin/service-charges/:id
const updateServiceCharge = async (req, res, next) => {
    try {
        const {
            serviceFee,
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
            where: { id: req.params.id }
        });
        if (!existing) {
            return res.status(404).json({ success: false, message: 'Service charge configuration not found' });
        }

        const data = {};
        if (serviceFee !== undefined) data.serviceFee = parseFloat(serviceFee) || 0;
        if (bookingFee !== undefined) data.bookingFee = parseFloat(bookingFee) || 0;
        if (platformFee !== undefined) data.platformFee = parseFloat(platformFee) || 0;
        if (convenienceFee !== undefined) data.convenienceFee = parseFloat(convenienceFee) || 0;
        if (emergencyFee !== undefined) data.emergencyFee = parseFloat(emergencyFee) || 0;
        if (visitFee !== undefined) data.visitFee = parseFloat(visitFee) || 0;
        if (nightCharge !== undefined) data.nightCharge = parseFloat(nightCharge) || 0;
        if (surgeCharge !== undefined) data.surgeCharge = parseFloat(surgeCharge) || 0;
        if (taxPercentage !== undefined) data.taxPercentage = parseFloat(taxPercentage) || 0;
        if (isSubscriptionEligible !== undefined) data.isSubscriptionEligible = isSubscriptionEligible;
        if (isActive !== undefined) data.isActive = isActive;

        const charge = await prisma.serviceCharge.update({
            where: { id: req.params.id },
            data,
        });

        // Sync with corresponding Service basePrice if serviceFee was updated
        if (serviceFee !== undefined) {
            try {
                const serviceCategoryLower = existing.serviceCategory.toLowerCase().replace(/_/g, '-');
                const service = await prisma.service.findFirst({
                    where: {
                        OR: [
                            { slug: serviceCategoryLower },
                            { name: { equals: existing.serviceCategory, mode: 'insensitive' } }
                        ]
                    }
                });
                if (service) {
                    await prisma.service.update({
                        where: { id: service.id },
                        data: { basePrice: parseFloat(serviceFee || 0) }
                    });
                }
            } catch (syncErr) {
                console.error('Failed to sync Service basePrice during update:', syncErr);
            }
        }

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
