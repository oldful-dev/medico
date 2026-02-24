// ──────────────────────────────────────────────
//  Admin Management Controller
// ──────────────────────────────────────────────

const prisma = require('../config/database');
const { hashPassword, paginate, sendPaginatedResponse, sendResponse } = require('../utils/helpers');

// GET /api/admin
const getAdmins = async (req, res, next) => {
    try {
        const { page, limit, skip } = paginate(req.query);
        const { role, cityId, search } = req.query;

        const where = {};
        if (role) where.role = role;
        if (cityId) where.cityId = cityId;
        if (search) {
            where.OR = [
                { name: { contains: search, mode: 'insensitive' } },
                { email: { contains: search, mode: 'insensitive' } },
            ];
        }

        const [admins, total] = await Promise.all([
            prisma.admin.findMany({
                where,
                skip,
                take: limit,
                include: { city: { select: { name: true, code: true } } },
                orderBy: { createdAt: 'desc' },
            }),
            prisma.admin.count({ where }),
        ]);

        // Strip sensitive fields
        const safeAdmins = admins.map(({ passwordHash, refreshToken, ...rest }) => rest);
        sendPaginatedResponse(res, safeAdmins, total, page, limit);
    } catch (error) {
        next(error);
    }
};

// GET /api/admin/:id
const getAdminById = async (req, res, next) => {
    try {
        const admin = await prisma.admin.findUnique({
            where: { id: req.params.id },
            include: { city: { select: { name: true, code: true } } },
        });
        if (!admin) return res.status(404).json({ success: false, message: 'Admin not found' });

        const { passwordHash, refreshToken, ...safeAdmin } = admin;
        sendResponse(res, 200, safeAdmin);
    } catch (error) {
        next(error);
    }
};

// PUT /api/admin/:id
const updateAdmin = async (req, res, next) => {
    try {
        const { name, email, phone, role, cityId, isActive } = req.body;
        const data = {};
        if (name !== undefined) data.name = name;
        if (email !== undefined) data.email = email;
        if (phone !== undefined) data.phone = phone;
        if (role !== undefined) data.role = role;
        if (cityId !== undefined) data.cityId = cityId;
        if (isActive !== undefined) data.isActive = isActive;

        const admin = await prisma.admin.update({
            where: { id: req.params.id },
            data,
        });

        const { passwordHash, refreshToken, ...safeAdmin } = admin;
        sendResponse(res, 200, safeAdmin, 'Admin updated successfully');
    } catch (error) {
        next(error);
    }
};

// PUT /api/admin/:id/password
const updateAdminPassword = async (req, res, next) => {
    try {
        const { password } = req.body;
        const passwordHash = await hashPassword(password);

        await prisma.admin.update({
            where: { id: req.params.id },
            data: { passwordHash },
        });

        sendResponse(res, 200, null, 'Password updated successfully');
    } catch (error) {
        next(error);
    }
};

// DELETE /api/admin/:id
const deleteAdmin = async (req, res, next) => {
    try {
        await prisma.admin.delete({ where: { id: req.params.id } });
        sendResponse(res, 200, null, 'Admin deleted successfully');
    } catch (error) {
        next(error);
    }
};

module.exports = { getAdmins, getAdminById, updateAdmin, updateAdminPassword, deleteAdmin };
