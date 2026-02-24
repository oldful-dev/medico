// ──────────────────────────────────────────────
//  Audit Log Controller
// ──────────────────────────────────────────────

const prisma = require('../config/database');
const { sendResponse, sendPaginatedResponse, paginate } = require('../utils/helpers');

// GET /api/audit-logs
const getAuditLogs = async (req, res, next) => {
    try {
        const { page, limit, skip } = paginate(req.query);
        const { entity, action, adminId, dateFrom, dateTo } = req.query;

        const where = {};
        if (entity) where.entity = entity;
        if (action) where.action = { contains: action, mode: 'insensitive' };
        if (adminId) where.adminId = adminId;
        if (dateFrom || dateTo) {
            where.createdAt = {};
            if (dateFrom) where.createdAt.gte = new Date(dateFrom);
            if (dateTo) where.createdAt.lte = new Date(dateTo);
        }

        const [logs, total] = await Promise.all([
            prisma.auditLog.findMany({
                where,
                skip,
                take: limit,
                include: { admin: { select: { name: true, email: true, role: true } } },
                orderBy: { createdAt: 'desc' },
            }),
            prisma.auditLog.count({ where }),
        ]);

        sendPaginatedResponse(res, logs, total, page, limit);
    } catch (error) {
        next(error);
    }
};

// GET /api/audit-logs/:id
const getAuditLogById = async (req, res, next) => {
    try {
        const log = await prisma.auditLog.findUnique({
            where: { id: req.params.id },
            include: { admin: { select: { name: true, email: true, role: true } } },
        });
        if (!log) return res.status(404).json({ success: false, message: 'Audit log not found' });
        sendResponse(res, 200, log);
    } catch (error) {
        next(error);
    }
};

module.exports = { getAuditLogs, getAuditLogById };
