// ──────────────────────────────────────────────
//  Wellness Store Controllers (Product + Category)
// ──────────────────────────────────────────────

const prisma = require('../config/database');
const { sendResponse, sendPaginatedResponse, paginate } = require('../utils/helpers');
const { logger } = require('../config/logger');
const { PRODUCT_ORDER_STATUSES, PRODUCT_ORDER_TRANSITIONS, isValidTransition, recordStatusTransition } = require('../utils/statusTransitions');

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
                include: { category: { select: { name: true } }, _count: { select: { waitlist: true, orders: true } } },
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
            include: {
                category: true,
                waitlist: { include: { user: { select: { name: true } } } },
                _count: { select: { orders: true, waitlist: true } },
            },
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

// POST /api/products/:id/order  — creates a ProductOrder and returns it for payment
const createProductOrder = async (req, res, next) => {
    try {
        const product = await prisma.product.findUnique({ where: { id: req.params.id } });
        if (!product) return res.status(404).json({ success: false, message: 'Product not found' });
        if (!product.isEnabled || product.stock < 1) {
            return res.status(400).json({ success: false, message: 'Product is out of stock' });
        }

        const { quantity = 1, address } = req.body;
        const amount = product.price * quantity;
        const orderCode = `ORD-${Date.now()}`;

        const order = await prisma.productOrder.create({
            data: {
                orderCode,
                userId: req.user.id,
                productId: product.id,
                quantity,
                amount,
                address,
                status: 'PENDING',
            },
            include: { product: { select: { name: true, imageUrl: true } } },
        });

        sendResponse(res, 201, order, 'Order created');
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

// ═══════════════════════════════════════════
//  ADMIN: ORDER MANAGEMENT
// ═══════════════════════════════════════════

// GET /api/products/admin/orders — list all product orders
const getAdminOrders = async (req, res, next) => {
    try {
        const { page, limit, skip } = paginate(req.query);
        const { status } = req.query;
        const where = status ? { status } : {};
        const [orders, total] = await Promise.all([
            prisma.productOrder.findMany({
                where,
                skip,
                take: limit,
                include: {
                    product: { select: { name: true, imageUrl: true } },
                    user: { select: { name: true, phone: true, uniqueUserId: true } },
                },
                orderBy: { createdAt: 'desc' },
            }),
            prisma.productOrder.count({ where }),
        ]);
        sendPaginatedResponse(res, orders, total, page, limit);
    } catch (error) {
        next(error);
    }
};

// PUT /api/products/admin/orders/:id/status — update order status, fires MEDICINE_OUT_FOR_DELIVERY SMS
const updateOrderStatus = async (req, res, next) => {
    try {
        const { status, estimatedDelivery, forceStatus } = req.body;
        if (!PRODUCT_ORDER_STATUSES.includes(status)) {
            return res.status(400).json({ success: false, message: 'Invalid status' });
        }

        const existing = await prisma.productOrder.findUnique({ where: { id: req.params.id }, select: { status: true } });
        if (!existing) return res.status(404).json({ success: false, message: 'Order not found' });
        if (!forceStatus && !isValidTransition(PRODUCT_ORDER_TRANSITIONS, existing.status, status)) {
            return res.status(400).json({
                success: false,
                message: `Invalid status transition: ${existing.status} → ${status}. Pass forceStatus:true to override.`,
            });
        }

        const order = await prisma.productOrder.update({
            where: { id: req.params.id },
            data: { status, ...(estimatedDelivery && { estimatedDelivery }) },
            include: {
                user: { select: { id: true, name: true, phone: true, smsEnabled: true } },
                product: { select: { name: true } },
            },
        });
        await recordStatusTransition({
            entityType: 'ProductOrder', entityId: order.id,
            fromStatus: existing.status, toStatus: status,
            changedBy: req.admin?.id || null,
            forced: !!forceStatus,
        });

        // DLT SMS — MEDICINE_OUT_FOR_DELIVERY (215398) when status changes to DISPATCHED
        // Var1=name, Var2=orderId, Var3=estimatedDelivery
        if (status === 'DISPATCHED' && order.user?.phone) {
            try {
                const { sendSMS } = require('../services/sms');
                if (order.user.smsEnabled !== false) {
                    await sendSMS({
                        template: 'MEDICINE_OUT_FOR_DELIVERY',
                        mobile: order.user.phone,
                        variables: [
                            order.user.name,
                            order.orderCode || order.id,
                            estimatedDelivery || 'today',
                        ],
                        userId: order.user.id,
                    });
                    logger.info(`[SMS] MEDICINE_OUT_FOR_DELIVERY sent → ${order.user.phone}`);
                }
            } catch (smsErr) {
                logger.warn('MEDICINE_OUT_FOR_DELIVERY SMS failed (non-fatal):', smsErr.message);
            }
        }

        sendResponse(res, 200, order, 'Order status updated');
    } catch (error) {
        next(error);
    }
};

const bulkToggleProducts = async (req, res, next) => {
    try {
        const { isEnabled } = req.body;
        if (isEnabled === undefined) {
            return res.status(400).json({ success: false, message: 'isEnabled is required' });
        }
        await prisma.product.updateMany({
            data: { isEnabled: !!isEnabled }
        });
        sendResponse(res, 200, null, `All products ${isEnabled ? 'enabled' : 'disabled'}`);
    } catch (error) {
        next(error);
    }
};

module.exports = {
    getProducts, getProductById, createProduct, updateProduct, deleteProduct,
    createProductOrder, joinWaitlist,
    getCategories, createCategory, updateCategory, deleteCategory,
    getAdminOrders, updateOrderStatus, bulkToggleProducts,
};
