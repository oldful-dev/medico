// ──────────────────────────────────────────────
//  Service Category Controller
//  Generic category CRUD shared by Home Essentials, Diagnostic & Fitness,
//  Tours & Travel, etc. — see ServiceCategory model in schema.prisma.
//  Every list/create/update/delete is scoped by the `module` query/body
//  field so unrelated admin pages never see or clobber each other's rows.
// ──────────────────────────────────────────────

const prisma = require('../config/database');
const { sendResponse } = require('../utils/helpers');

// GET /api/service-categories?module=HOME_ESSENTIALS
const getServiceCategories = async (req, res, next) => {
    try {
        const { module } = req.query;
        if (!module) return res.status(400).json({ success: false, message: 'module query param is required' });

        const categories = await prisma.serviceCategory.findMany({
            where: { module },
            orderBy: { sortOrder: 'asc' },
        });
        sendResponse(res, 200, categories);
    } catch (error) {
        next(error);
    }
};

// POST /api/service-categories
const createServiceCategory = async (req, res, next) => {
    try {
        const { module, name, slug, imageUrl, sortOrder, isEnabled } = req.body;
        if (!module || !name || !slug) {
            return res.status(400).json({ success: false, message: 'module, name and slug are required' });
        }

        const category = await prisma.serviceCategory.create({
            data: {
                module,
                name,
                slug,
                imageUrl,
                sortOrder: sortOrder !== undefined && sortOrder !== null ? parseInt(sortOrder, 10) : undefined,
                isEnabled: isEnabled !== undefined ? (isEnabled === true || isEnabled === 'true') : undefined,
            },
        });
        sendResponse(res, 201, category, 'Category created');
    } catch (error) {
        next(error);
    }
};

// PUT /api/service-categories/:id
const updateServiceCategory = async (req, res, next) => {
    try {
        const data = { ...req.body };
        delete data.id;
        delete data.module; // module is fixed at creation — reassigning would move a category between admin pages silently
        if (data.sortOrder !== undefined && data.sortOrder !== null) {
            data.sortOrder = parseInt(data.sortOrder, 10);
        }
        if (data.isEnabled !== undefined && data.isEnabled !== null) {
            data.isEnabled = data.isEnabled === true || data.isEnabled === 'true';
        }

        const category = await prisma.serviceCategory.update({
            where: { id: req.params.id },
            data,
        });
        sendResponse(res, 200, category, 'Category updated');
    } catch (error) {
        next(error);
    }
};

// PUT /api/service-categories/:id/toggle
const toggleServiceCategory = async (req, res, next) => {
    try {
        const category = await prisma.serviceCategory.findUnique({ where: { id: req.params.id } });
        if (!category) return res.status(404).json({ success: false, message: 'Category not found' });
        const updated = await prisma.serviceCategory.update({
            where: { id: req.params.id },
            data: { isEnabled: !category.isEnabled },
        });
        sendResponse(res, 200, updated, `Category ${updated.isEnabled ? 'enabled' : 'disabled'}`);
    } catch (error) {
        next(error);
    }
};

// PUT /api/service-categories/reorder  { orderedIds: [...] }
const reorderServiceCategories = async (req, res, next) => {
    try {
        const { orderedIds } = req.body;
        const updates = orderedIds.map((id, index) =>
            prisma.serviceCategory.update({ where: { id }, data: { sortOrder: index + 1 } })
        );
        await prisma.$transaction(updates);
        sendResponse(res, 200, null, 'Categories reordered');
    } catch (error) {
        next(error);
    }
};

// DELETE /api/service-categories/:id
const deleteServiceCategory = async (req, res, next) => {
    try {
        await prisma.serviceCategory.delete({ where: { id: req.params.id } });
        sendResponse(res, 200, null, 'Category deleted');
    } catch (error) {
        next(error);
    }
};

module.exports = {
    getServiceCategories,
    createServiceCategory,
    updateServiceCategory,
    toggleServiceCategory,
    reorderServiceCategories,
    deleteServiceCategory,
};
