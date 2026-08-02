// ──────────────────────────────────────────────
//  Role-Based Access Control Middleware
// ──────────────────────────────────────────────

const ADMIN_ROLES = {
    SUPER_ADMIN: 'SUPER_ADMIN',
    CITY_ADMIN: 'CITY_ADMIN',
    OPS_EXEC: 'OPS_EXEC',
    CARE_MANAGER: 'CARE_MANAGER',
    BILLING_EXEC: 'BILLING_EXECUTIVE',
    SUPPORT_AGENT: 'SUPPORT_AGENT',
};

/**
 * Restrict access to specific admin roles
 * Usage: authorize('SUPER_ADMIN', 'CITY_ADMIN', 'OPS_EXEC')
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
 * Roles with All-India access (SUPER_ADMIN, OPS_EXEC, CARE_MANAGER, BILLING_EXECUTIVE, SUPPORT_AGENT) bypass city restriction
 */
const cityRestriction = (req, res, next) => {
    if (!req.user || req.user.type !== 'admin') {
        return next();
    }

    // All-India roles bypass city restriction
    const ALL_INDIA_ROLES = ['SUPER_ADMIN', 'OPS_EXEC', 'CARE_MANAGER', 'BILLING_EXECUTIVE', 'SUPPORT_AGENT'];
    if (ALL_INDIA_ROLES.includes(req.user.role)) {
        return next();
    }

    // City Admin can only access their assigned city
    if (req.admin && req.admin.cityId) {
        req.cityFilter = req.admin.cityId;
    }

    next();
};

/**
 * Block payment & financial modules for roles that exclude financial access (e.g. CITY_ADMIN, OPS_EXEC)
 */
const blockPaymentModulesForNonBilling = (req, res, next) => {
    if (!req.user || req.user.type !== 'admin') {
        return next();
    }

    const RESTRICTED_ROLES = ['CITY_ADMIN', 'OPS_EXEC', 'CARE_MANAGER', 'SUPPORT_AGENT'];
    if (RESTRICTED_ROLES.includes(req.user.role)) {
        return res.status(403).json({
            success: false,
            message: 'Access Denied: Payment and financial modules are restricted.',
        });
    }

    next();
};

module.exports = {
    ADMIN_ROLES,
    authorize,
    cityRestriction,
    blockPaymentModulesForNonBilling,
};
