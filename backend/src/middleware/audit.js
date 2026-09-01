// ──────────────────────────────────────────────
//  Audit Logger Middleware
//  Logs admin actions to the AuditLog table
// ──────────────────────────────────────────────

const prisma = require('../config/database');
const { logger } = require('../config/logger');

/**
 * Create an audit log entry
 * @param {Object} opts
 */
const createAuditLog = async ({
    adminId,
    action,
    entity,
    entityId,
    oldValue = null,
    newValue = null,
    ipAddress = null,
    userAgent = null,
}) => {
    try {
        await prisma.auditLog.create({
            data: {
                adminId,
                action,
                entity,
                entityId,
                oldValue: oldValue ? JSON.parse(JSON.stringify(oldValue)) : null,
                newValue: newValue ? JSON.parse(JSON.stringify(newValue)) : null,
                ipAddress,
                userAgent,
            },
        });
    } catch (error) {
        logger.error('Failed to create audit log:', error);
    }
};

/**
 * Middleware that auto-logs any non-GET request from admins
 */
const auditMiddleware = (entity) => {
    return (req, res, next) => {
        // Store original json method
        const originalJson = res.json.bind(res);

        res.json = (body) => {
            // Only log successful mutations
            if (req.method !== 'GET' && req.user && req.user.type === 'admin' && res.statusCode < 400) {
                createAuditLog({
                    adminId: req.user.id,
                    action: `${req.method}_${entity.toUpperCase()}`,
                    entity,
                    entityId: req.params.id || body?.data?.id || null,
                    ipAddress: req.ip,
                    userAgent: req.get('user-agent'),
                });
            }
            return originalJson(body);
        };

        next();
    };
};

/**
 * Middleware that logs admin READS of PHI/sensitive records — the plain
 * auditMiddleware above deliberately skips GET requests (it's a mutation
 * logger), so viewing/downloading a patient's health data left no trail at
 * all. This is that missing read-audit: without it, an admin viewing or
 * downloading a patient's medical records is undetectable after the fact.
 */
const auditReadMiddleware = (entity) => {
    return (req, res, next) => {
        const originalJson = res.json.bind(res);

        res.json = (body) => {
            if (req.user && req.user.type === 'admin' && res.statusCode < 400) {
                createAuditLog({
                    adminId: req.user.id,
                    action: `VIEW_${entity.toUpperCase()}`,
                    entity,
                    entityId: req.params.id || req.params.reportId || null,
                    ipAddress: req.ip,
                    userAgent: req.get('user-agent'),
                });
            }
            return originalJson(body);
        };

        next();
    };
};

module.exports = { createAuditLog, auditMiddleware, auditReadMiddleware };
