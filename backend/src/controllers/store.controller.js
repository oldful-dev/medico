// ──────────────────────────────────────────────
//  Wellness Store Controllers (Product + Category)
// ──────────────────────────────────────────────

const prisma = require('../config/database');
const { sendResponse, sendPaginatedResponse, paginate } = require('../utils/helpers');

// ═══════════════════════════════════════════
//  PRODUCTS
// ═══════════════════════════════════════════

const getProducts = async (req, res, next) => {
    try {
        const { page, limit, skip } = paginate(req.query);
        const { categoryId, isEnabled, search } = req.query;

        const where = {};
        if (categoryId) where.categoryId = categoryId;
        if (isEnabled !== undefined) where.isEnabled = isEnabled === 'true';
        if (search) where.name = { contains: search, mode: 'insensitive' };

        const [products, total] = await Promise.all([
            prisma.product.findMany({
                where,
                skip,
                take: limit,
                include: { category: { select: { name: true } }, _count: { select: { waitlist: true } } },
                orderBy: { createdAt: 'desc' },
            }),
            prisma.product.count({ where }),
        ]);

        sendPaginatedResponse(res, products, total, page, limit);
    } catch (error) {
        next(error);
    }
};

const getProductById = async (req, res, next) => {
    try {
        const product = await prisma.product.findUnique({
            where: { id: req.params.id },
            include: { category: true, waitlist: { include: { user: { select: { name: true } } } } },
        });
        if (!product) return res.status(404).json({ success: false, message: 'Product not found' });
        sendResponse(res, 200, product);
    } catch (error) {
        next(error);
    }
};

const createProduct = async (req, res, next) => {
    try {
        const product = await prisma.product.create({ data: req.body });
        sendResponse(res, 201, product, 'Product created');
    } catch (error) {
        next(error);
    }
};

const updateProduct = async (req, res, next) => {
    try {
        const product = await prisma.product.update({ where: { id: req.params.id }, data: req.body });
        sendResponse(res, 200, product, 'Product updated');
    } catch (error) {
        next(error);
    }
};

const deleteProduct = async (req, res, next) => {
    try {
        await prisma.product.delete({ where: { id: req.params.id } });
        sendResponse(res, 200, null, 'Product deleted');
    } catch (error) {
        next(error);
    }
};

// POST /api/products/:id/waitlist
const joinWaitlist = async (req, res, next) => {
    try {
        const entry = await prisma.waitlistEntry.create({
            data: { userId: req.user.id, productId: req.params.id },
        });
        sendResponse(res, 201, entry, 'Added to waitlist');
    } catch (error) {
        if (error.code === 'P2002') {
            return res.status(409).json({ success: false, message: 'Already on waitlist' });
        }
        next(error);
    }
};

// ═══════════════════════════════════════════
//  CATEGORIES
// ═══════════════════════════════════════════

const getCategories = async (req, res, next) => {
    try {
        const categories = await prisma.category.findMany({
            orderBy: { sortOrder: 'asc' },
            include: { _count: { select: { products: true } } },
        });
        sendResponse(res, 200, categories);
    } catch (error) {
        next(error);
    }
};

const createCategory = async (req, res, next) => {
    try {
        const category = await prisma.category.create({ data: req.body });
        sendResponse(res, 201, category, 'Category created');
    } catch (error) {
        next(error);
    }
};

const updateCategory = async (req, res, next) => {
    try {
        const category = await prisma.category.update({ where: { id: req.params.id }, data: req.body });
        sendResponse(res, 200, category, 'Category updated');
    } catch (error) {
        next(error);
    }
};

const deleteCategory = async (req, res, next) => {
    try {
        await prisma.category.delete({ where: { id: req.params.id } });
        sendResponse(res, 200, null, 'Category deleted');
    } catch (error) {
        next(error);
    }
};

module.exports = {
    getProducts, getProductById, createProduct, updateProduct, deleteProduct, joinWaitlist,
    getCategories, createCategory, updateCategory, deleteCategory,
};
