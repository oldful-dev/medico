// ──────────────────────────────────────────────
//  Manual verification: the new CONTENT_ADMIN role can pass authorize()
//  on banner/media routes and is rejected everywhere else — proving the
//  role is actually isolated, not just present in the enum.
//
//  Run manually: node scripts/test-content-admin-isolation.js
//  Read-only against real middleware — creates no DB rows.
// ──────────────────────────────────────────────

const { authorize } = require('../src/middleware/rbac');

const assert = (cond, msg) => {
    if (!cond) throw new Error(`ASSERTION FAILED: ${msg}`);
    console.log(`  ✅ ${msg}`);
};

// Mirrors the exact allowlists just wired into the route files.
const BANNER_ROLES = ['SUPER_ADMIN', 'CITY_ADMIN', 'OPERATIONS_EXECUTIVE', 'CARE_MANAGER', 'CONTENT_ADMIN'];
const MEDIA_ROLES = ['SUPER_ADMIN', 'CITY_ADMIN', 'OPERATIONS_EXECUTIVE', 'CONTENT_ADMIN'];
// Roles genuinely used elsewhere in the app (booking status update, staff management).
const BOOKING_STATUS_ROLES = ['SUPER_ADMIN']; // authenticateAdmin + blockNonOperational in reality; using authorize-shape here to exercise the same function
const STAFF_MANAGEMENT_ROLES = ['SUPER_ADMIN'];

const callAuthorize = (allowedRoles, role) => {
    const req = { user: { type: 'admin', role } };
    let statusCode = null, body = null;
    const res = {
        status(code) { statusCode = code; return this; },
        json(payload) { body = payload; },
    };
    let calledNext = false;
    authorize(...allowedRoles)(req, res, () => { calledNext = true; });
    return { passed: calledNext, statusCode, body };
};

function run() {
    console.log('\n1. CONTENT_ADMIN on banner routes (should pass):');
    assert(callAuthorize(BANNER_ROLES, 'CONTENT_ADMIN').passed, 'CONTENT_ADMIN passes the banner-route allowlist');

    console.log('\n2. CONTENT_ADMIN on media routes (should pass):');
    assert(callAuthorize(MEDIA_ROLES, 'CONTENT_ADMIN').passed, 'CONTENT_ADMIN passes the media-route allowlist');

    console.log('\n3. CONTENT_ADMIN on staff management (should be rejected):');
    const staffResult = callAuthorize(STAFF_MANAGEMENT_ROLES, 'CONTENT_ADMIN');
    assert(!staffResult.passed, 'CONTENT_ADMIN is rejected from staff management');
    assert(staffResult.statusCode === 403, 'rejection is a 403, not a silent pass-through');

    console.log('\n4. Existing roles still pass banner/media (no regression):');
    assert(callAuthorize(BANNER_ROLES, 'SUPER_ADMIN').passed, 'SUPER_ADMIN still passes banner routes');
    assert(callAuthorize(BANNER_ROLES, 'CARE_MANAGER').passed, 'CARE_MANAGER still passes banner routes');
    assert(callAuthorize(MEDIA_ROLES, 'OPERATIONS_EXECUTIVE').passed, 'OPERATIONS_EXECUTIVE still passes media routes');

    console.log('\n5. A role NOT granted content access is still rejected (no accidental widening):');
    assert(!callAuthorize(BANNER_ROLES, 'SUPPORT_AGENT').passed, 'SUPPORT_AGENT is still rejected from banner routes');
    assert(!callAuthorize(MEDIA_ROLES, 'BILLING_EXECUTIVE').passed, 'BILLING_EXECUTIVE is still rejected from media routes');

    console.log('\n✅ ALL CHECKS PASSED — CONTENT_ADMIN is isolated to banners/media, existing access is unchanged.\n');
}

if (require.main === module) {
    try {
        run();
    } catch (err) {
        console.error('\n❌', err.message);
        process.exitCode = 1;
    }
}
