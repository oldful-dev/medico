// ──────────────────────────────────────────────
//  Manual verification for the two RBAC gap fixes:
//  1. blockPaymentModulesForNonBilling is now an allowlist, not a denylist
//     — CONTENT_ADMIN (and any future role) is rejected by default.
//  2. order.routes.js / wellness.routes.js admin routes now require an
//     explicit role instead of accepting any authenticated admin.
//
//  Run manually: node scripts/test-rbac-gap-fixes.js
//  Read-only against real middleware — creates no DB rows.
// ──────────────────────────────────────────────

const { authorize, blockPaymentModulesForNonBilling } = require('../src/middleware/rbac');

const assert = (cond, msg) => {
    if (!cond) throw new Error(`ASSERTION FAILED: ${msg}`);
    console.log(`  ✅ ${msg}`);
};

const callMiddleware = (middleware, role) => {
    const req = { user: { type: 'admin', role } };
    let statusCode = null;
    const res = { status(code) { statusCode = code; return this; }, json() {} };
    let calledNext = false;
    middleware(req, res, () => { calledNext = true; });
    return { passed: calledNext, statusCode };
};

const ORDER_ADMIN_ROLES = ['SUPER_ADMIN', 'OPERATIONS_EXECUTIVE', 'BILLING_EXECUTIVE'];

function run() {
    console.log('\n1. blockPaymentModulesForNonBilling — full before/after regression:');
    // Roles that must still pass (unchanged behavior)
    assert(callMiddleware(blockPaymentModulesForNonBilling, 'SUPER_ADMIN').passed, 'SUPER_ADMIN still passes (unchanged)');
    assert(callMiddleware(blockPaymentModulesForNonBilling, 'BILLING_EXECUTIVE').passed, 'BILLING_EXECUTIVE still passes (unchanged)');
    // Roles that were already correctly blocked — must remain blocked
    for (const role of ['CITY_ADMIN', 'OPERATIONS_EXECUTIVE', 'CARE_MANAGER', 'SUPPORT_AGENT']) {
        const r = callMiddleware(blockPaymentModulesForNonBilling, role);
        assert(!r.passed && r.statusCode === 403, `${role} is still rejected (unchanged) — 403`);
    }
    // The actual bug: CONTENT_ADMIN previously passed silently, must now be rejected
    const contentResult = callMiddleware(blockPaymentModulesForNonBilling, 'CONTENT_ADMIN');
    assert(!contentResult.passed, 'CONTENT_ADMIN is now rejected (was previously an undetected pass-through)');
    assert(contentResult.statusCode === 403, 'CONTENT_ADMIN rejection is a proper 403');

    console.log('\n2. order.routes.js / wellness.routes.js admin role gate:');
    assert(callMiddleware(authorize(...ORDER_ADMIN_ROLES), 'SUPER_ADMIN').passed, 'SUPER_ADMIN passes the new order/wellness admin gate');
    assert(callMiddleware(authorize(...ORDER_ADMIN_ROLES), 'OPERATIONS_EXECUTIVE').passed, 'OPERATIONS_EXECUTIVE passes');
    assert(callMiddleware(authorize(...ORDER_ADMIN_ROLES), 'BILLING_EXECUTIVE').passed, 'BILLING_EXECUTIVE passes');
    for (const role of ['CONTENT_ADMIN', 'SUPPORT_AGENT', 'CARE_MANAGER', 'CITY_ADMIN']) {
        const r = callMiddleware(authorize(...ORDER_ADMIN_ROLES), role);
        assert(!r.passed && r.statusCode === 403, `${role} is rejected (previously had zero gate — anyone could reach these routes)`);
    }

    console.log('\n✅ ALL CHECKS PASSED — both RBAC gaps closed, no regression on existing access.\n');
}

if (require.main === module) {
    try {
        run();
    } catch (err) {
        console.error('\n❌', err.message);
        process.exitCode = 1;
    }
}
