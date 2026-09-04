// ──────────────────────────────────────────────
//  Role-Based Access Control Middleware
// ──────────────────────────────────────────────

const ADMIN_ROLES = {
    SUPER_ADMIN: 'SUPER_ADMIN',
    CITY_ADMIN: 'CITY_ADMIN',
    OPS_EXEC: 'OPERATIONS_EXECUTIVE',
    CARE_MANAGER: 'CARE_MANAGER',
    BILLING_EXEC: 'BILLING_EXECUTIVE',
    SUPPORT_AGENT: 'SUPPORT_AGENT',
};

/**
 * Restrict access to specific admin roles.
 * Usage: authorize('SUPER_ADMIN', 'CITY_ADMIN', 'OPERATIONS_EXECUTIVE')
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
 * Restrict admin to their assigned city's data.
 * All-India roles bypass city restriction.
 */
const cityRestriction = (req, res, next) => {
    if (!req.user || req.user.type !== 'admin') return next();
    const ALL_INDIA_ROLES = ['SUPER_ADMIN', 'OPERATIONS_EXECUTIVE', 'CARE_MANAGER', 'BILLING_EXECUTIVE', 'SUPPORT_AGENT'];
    if (ALL_INDIA_ROLES.includes(req.user.role)) return next();
    // City Admin can only access their assigned city
    if (req.admin && req.admin.cityId) req.cityFilter = req.admin.cityId;
    next();
};

/**
 * Block payment & financial modules for non-billing roles.
 * Allowed: SUPER_ADMIN, BILLING_EXECUTIVE only.
 *
 * Was a denylist of 4 named roles — any role NOT on that list (including a
 * newly-added one like CONTENT_ADMIN) passed through by default, silently
 * contradicting this function's own doc comment. An allowlist can't drift
 * that way: a new role is excluded by default until someone deliberately
 * adds it here.
 */
const blockPaymentModulesForNonBilling = (req, res, next) => {
    if (!req.user || req.user.type !== 'admin') return next();
    const ALLOWED_ROLES = ['SUPER_ADMIN', 'BILLING_EXECUTIVE'];
    if (!ALLOWED_ROLES.includes(req.user.role)) {
        return res.status(403).json({
            success: false,
            message: 'Access Denied: Payment and financial modules are restricted to Billing team only.',
        });
    }
    next();
};

/**
 * Block roles that should not access operational modules (services, bookings, banners etc).
 * Allowed: SUPER_ADMIN, CITY_ADMIN, OPERATIONS_EXECUTIVE, CARE_MANAGER only.
 */
const blockNonOperational = (req, res, next) => {
    if (!req.user || req.user.type !== 'admin') return next();
    const OPERATIONAL_ROLES = ['SUPER_ADMIN', 'CITY_ADMIN', 'OPERATIONS_EXECUTIVE', 'CARE_MANAGER'];
    if (!OPERATIONAL_ROLES.includes(req.user.role)) {
        return res.status(403).json({
            success: false,
            message: 'Access Denied: This module is restricted to operational roles only.',
        });
    }
    next();
};

/**
 * Block roles that should not access media/notifications/meetup/cities.
 * Allowed: SUPER_ADMIN, CITY_ADMIN, OPERATIONS_EXECUTIVE only.
 */
const blockNonManagement = (req, res, next) => {
    if (!req.user || req.user.type !== 'admin') return next();
    const MANAGEMENT_ROLES = ['SUPER_ADMIN', 'CITY_ADMIN', 'OPERATIONS_EXECUTIVE'];
    if (!MANAGEMENT_ROLES.includes(req.user.role)) {
        return res.status(403).json({
            success: false,
            message: 'Access Denied: This module is restricted to management roles only.',
        });
    }
    next();
};

module.exports = {
    ADMIN_ROLES,
    authorize,
    cityRestriction,
    blockPaymentModulesForNonBilling,
    blockNonOperational,
    blockNonManagement,
};
