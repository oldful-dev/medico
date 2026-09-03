// ──────────────────────────────────────────────
//  Status History Controller
//  Read-only access to StatusTransitionLog — shared by Booking and
//  ProductOrder admin views (see utils/statusTransitions.js for the writer).
// ──────────────────────────────────────────────

const prisma = require('../config/database');
const { sendResponse } = require('../utils/helpers');

const ENTITY_TYPES = new Set(['Booking', 'ProductOrder']);

// GET /api/status-history/:entityType/:entityId
const getStatusHistory = async (req, res, next) => {
    try {
        const { entityType, entityId } = req.params;
        if (!ENTITY_TYPES.has(entityType)) {
            return res.status(400).json({ success: false, message: `Unknown entityType: ${entityType}` });
        }

        const logs = await prisma.statusTransitionLog.findMany({
            where: { entityType, entityId },
            orderBy: { createdAt: 'desc' },
        });

        sendResponse(res, 200, logs);
    } catch (error) {
        next(error);
    }
};

module.exports = { getStatusHistory };
