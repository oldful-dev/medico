// ──────────────────────────────────────────────
//  Service Management Controller
// ──────────────────────────────────────────────

const prisma = require('../config/database');
const { sendResponse, sendPaginatedResponse, paginate } = require('../utils/helpers');
const { uploadToCloudinary } = require('../utils/fileUpload');

// GET /api/services
const getServices = async (req, res, next) => {
    try {
        const { isEnabled, search } = req.query;
        const where = {};
        if (isEnabled !== undefined) where.isEnabled = isEnabled === 'true';
        if (search) {
            where.OR = [
                { name: { contains: search, mode: 'insensitive' } },
                { slug: { contains: search, mode: 'insensitive' } },
            ];
        }

        const services = await prisma.service.findMany({
            where,
            orderBy: { sortOrder: 'asc' },
            include: { _count: { select: { bookings: true } } },
        });

        sendResponse(res, 200, services);
    } catch (error) {
        next(error);
    }
};

// GET /api/services/:id
const getServiceById = async (req, res, next) => {
    try {
        const service = await prisma.service.findUnique({
            where: { id: req.params.id },
            include: { _count: { select: { bookings: true } } },
        });
        if (!service) return res.status(404).json({ success: false, message: 'Service not found' });
        sendResponse(res, 200, service);
    } catch (error) {
        next(error);
    }
};

// POST /api/services
const createService = async (req, res, next) => {
    try {
        const { name, slug, icon, tagline, description, pricingText, route, sortOrder, isEnabled, serviceType, formFieldsJson } = req.body;

        const service = await prisma.service.create({
            data: { name, slug, icon, tagline, description, pricingText, route, sortOrder, isEnabled, serviceType, formFieldsJson },
        });

        sendResponse(res, 201, service, 'Service created successfully');
    } catch (error) {
        next(error);
    }
};

// PUT /api/services/:id
const updateService = async (req, res, next) => {
    try {
        const service = await prisma.service.update({
            where: { id: req.params.id },
            data: req.body,
        });
        sendResponse(res, 200, service, 'Service updated successfully');
    } catch (error) {
        next(error);
    }
};

// PUT /api/services/:id/toggle
const toggleService = async (req, res, next) => {
    try {
        const service = await prisma.service.findUnique({ where: { id: req.params.id } });
        const updated = await prisma.service.update({
            where: { id: req.params.id },
            data: { isEnabled: !service.isEnabled },
        });
        sendResponse(res, 200, updated, `Service ${updated.isEnabled ? 'enabled' : 'disabled'}`);
    } catch (error) {
        next(error);
    }
};

// PUT /api/services/reorder
const reorderServices = async (req, res, next) => {
    try {
        const { orderedIds } = req.body; // array of service IDs in desired order
        const updates = orderedIds.map((id, index) =>
            prisma.service.update({ where: { id }, data: { sortOrder: index + 1 } })
        );
        await prisma.$transaction(updates);
        sendResponse(res, 200, null, 'Services reordered');
    } catch (error) {
        next(error);
    }
};

// POST /api/services/:id/hero-image
const uploadHeroImage = async (req, res, next) => {
    try {
        if (!req.file) return res.status(400).json({ success: false, message: 'Image required' });
        const { url } = await uploadToCloudinary(req.file.buffer, 'service-images');
        const service = await prisma.service.update({
            where: { id: req.params.id },
            data: { heroImageUrl: url },
        });
        sendResponse(res, 200, service, 'Hero image uploaded');
    } catch (error) {
        next(error);
    }
};

// DELETE /api/services/:id
const deleteService = async (req, res, next) => {
    try {
        await prisma.service.delete({ where: { id: req.params.id } });
        sendResponse(res, 200, null, 'Service deleted');
    } catch (error) {
        next(error);
    }
};

module.exports = {
    getServices, getServiceById, createService, updateService,
    toggleService, reorderServices, uploadHeroImage, deleteService,
};
