// ──────────────────────────────────────────────
//  City Management Controller
// ──────────────────────────────────────────────

const prisma = require('../config/database');
const { sendResponse, paginate, sendPaginatedResponse } = require('../utils/helpers');

// GET /api/cities
const getCities = async (req, res, next) => {
    try {
        const { page, limit, skip } = paginate(req.query);
        const { isEnabled, search } = req.query;

        const where = {};
        if (isEnabled !== undefined) where.isEnabled = isEnabled === 'true';
        if (search) {
            where.OR = [
                { name: { contains: search, mode: 'insensitive' } },
                { code: { contains: search, mode: 'insensitive' } },
            ];
        }

        const [cities, total] = await Promise.all([
            prisma.city.findMany({
                where,
                skip,
                take: limit,
                include: {
                    _count: {
                        select: { users: true, bookings: true, admins: true, caregivers: true },
                    },
                },
                orderBy: { name: 'asc' },
            }),
            prisma.city.count({ where }),
        ]);

        sendPaginatedResponse(res, cities, total, page, limit);
    } catch (error) {
        next(error);
    }
};

// GET /api/cities/:id
const getCityById = async (req, res, next) => {
    try {
        const city = await prisma.city.findUnique({
            where: { id: req.params.id },
            include: {
                _count: {
                    select: { users: true, bookings: true, admins: true, caregivers: true },
                },
            },
        });
        if (!city) return res.status(404).json({ success: false, message: 'City not found' });
        sendResponse(res, 200, city);
    } catch (error) {
        next(error);
    }
};

// POST /api/cities
const createCity = async (req, res, next) => {
    try {
        const { name, code, stateCode, isEnabled, isComingSoon } = req.body;
        const city = await prisma.city.create({
            data: { name, code: code.toUpperCase(), stateCode, isEnabled, isComingSoon },
        });
        sendResponse(res, 201, city, 'City created successfully');
    } catch (error) {
        next(error);
    }
};

// PUT /api/cities/:id
const updateCity = async (req, res, next) => {
    try {
        const { name, code, stateCode, isEnabled, isComingSoon } = req.body;
        const data = {};
        if (name !== undefined) data.name = name;
        if (code !== undefined) data.code = code.toUpperCase();
        if (stateCode !== undefined) data.stateCode = stateCode;
        if (isEnabled !== undefined) data.isEnabled = isEnabled;
        if (isComingSoon !== undefined) data.isComingSoon = isComingSoon;

        const city = await prisma.city.update({
            where: { id: req.params.id },
            data,
        });
        sendResponse(res, 200, city, 'City updated successfully');
    } catch (error) {
        next(error);
    }
};

// DELETE /api/cities/:id
const deleteCity = async (req, res, next) => {
    try {
        await prisma.city.delete({ where: { id: req.params.id } });
        sendResponse(res, 200, null, 'City deleted successfully');
    } catch (error) {
        next(error);
    }
};

// GET /api/cities/:id/revenue
const getCityRevenue = async (req, res, next) => {
    try {
        const { id } = req.params;

        const payments = await prisma.payment.findMany({
            where: {
                status: 'SUCCESS',
                booking: { cityId: id },
            },
            select: { amount: true, createdAt: true },
        });

        const totalRevenue = payments.reduce((sum, p) => sum + p.amount, 0);

        sendResponse(res, 200, {
            cityId: id,
            totalRevenue,
            totalTransactions: payments.length,
        });
    } catch (error) {
        next(error);
    }
};

module.exports = { getCities, getCityById, createCity, updateCity, deleteCity, getCityRevenue };
