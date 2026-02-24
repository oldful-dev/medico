// ──────────────────────────────────────────────
//  Role-Based Access Control Middleware
// ──────────────────────────────────────────────

/**
 * Restrict access to specific admin roles
 * Usage: authorize('SUPER_ADMIN', 'CITY_ADMIN')
 */
const authorize = (...allowedRoles) => {
    return (req, res, next) => {
        if (!req.user || req.user.type !== 'admin') {
            return res.status(403).json({ success: false, message: 'Admin access required' });
        }

        if (!allowedRoles.includes(req.user.role)) {
            return res.status(403).json({
                success: false,
                message: `Insufficient permissions. Required roles: ${allowedRoles.join(', ')}`,
            });
        }

        next();
    };
};

/**
 * Restrict admin to their assigned city's data
 * SUPER_ADMIN bypasses city restriction
 */
const cityRestriction = (req, res, next) => {
    if (!req.user || req.user.type !== 'admin') {
        return next();
    }

    // SUPER_ADMIN can access all cities
    if (req.user.role === 'SUPER_ADMIN') {
        return next();
    }

    // Other admins can only access their assigned city
    if (req.admin && req.admin.cityId) {
        req.cityFilter = req.admin.cityId;
    }

    next();
};

module.exports = { authorize, cityRestriction };
