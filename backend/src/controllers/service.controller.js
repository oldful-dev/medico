// ──────────────────────────────────────────────
//  Service Management Controller
// ──────────────────────────────────────────────

const prisma = require('../config/database');
const { sendResponse, sendPaginatedResponse, paginate } = require('../utils/helpers');
const { uploadFile } = require('../utils/storage.service');

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
        const { name, slug, icon, tagline, description, pricingText, basePrice, route, sortOrder, isEnabled, serviceType, formFieldsJson, headline, subhead, checkoutGroup } = req.body;

        let parsedBasePrice = basePrice;
        if (parsedBasePrice === undefined && pricingText) {
            const match = pricingText.match(/[\d,]+/);
            if (match) {
                parsedBasePrice = parseInt(match[0].replace(/,/g, ''), 10);
            }
        }

        const service = await prisma.service.create({
            data: {
                name,
                slug,
                icon,
                tagline,
                description,
                pricingText,
                basePrice: parsedBasePrice !== undefined && parsedBasePrice !== null ? parseFloat(parsedBasePrice) : undefined,
                route,
                sortOrder: sortOrder !== undefined && sortOrder !== null ? parseInt(sortOrder, 10) : undefined,
                isEnabled: isEnabled !== undefined && isEnabled !== null ? (isEnabled === true || isEnabled === 'true') : undefined,
                serviceType,
                formFieldsJson,
                headline,
                subhead,
                checkoutGroup
            },
        });

        sendResponse(res, 201, service, 'Service created successfully');
    } catch (error) {
        next(error);
    }
};

// PUT /api/services/:id
const updateService = async (req, res, next) => {
    try {
        const data = { ...req.body };
        if (data.pricingText !== undefined && data.basePrice === undefined) {
            const match = data.pricingText.match(/[\d,]+/);
            if (match) {
                data.basePrice = parseInt(match[0].replace(/,/g, ''), 10);
            } else {
                data.basePrice = null;
            }
        }

        if (data.basePrice !== undefined && data.basePrice !== null) {
            data.basePrice = parseFloat(data.basePrice);
        }
        if (data.sortOrder !== undefined && data.sortOrder !== null) {
            data.sortOrder = parseInt(data.sortOrder, 10);
        }
        if (data.isEnabled !== undefined && data.isEnabled !== null) {
            data.isEnabled = data.isEnabled === true || data.isEnabled === 'true';
        }

        const service = await prisma.service.update({
            where: { id: req.params.id },
            data,
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
        const { url } = await uploadFile(req.file.buffer, 'service-images', req.file.originalname);
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
        const id = req.params.id;
        const bookingsCount = await prisma.booking.count({ where: { serviceId: id } });
        if (bookingsCount > 0) {
            const updated = await prisma.service.update({
                where: { id },
                data: { isEnabled: false },
            });
            return sendResponse(res, 200, updated, 'Service has active bookings; it has been disabled instead');
        }
        await prisma.service.delete({ where: { id } });
        sendResponse(res, 200, null, 'Service deleted successfully');
    } catch (error) {
        next(error);
    }
};

module.exports = {
    getServices, getServiceById, createService, updateService,
    toggleService, reorderServices, uploadHeroImage, deleteService,
};
