// ──────────────────────────────────────────────
//  Manual verification: changing an Admin's role or isActive status now
//  produces a real ADMIN_ACCESS_CHANGED audit row with old/new values —
//  previously only the generic action/entityId-only auditMiddleware fired.
//
//  Run manually: node scripts/test-admin-role-change-audit.js
//  Creates its own throwaway Admin row, never touches a real one. Cleans up
//  on success or failure.
// ──────────────────────────────────────────────

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { hashPassword } = require('../src/utils/helpers');
const adminCtrl = require('../src/controllers/admin.controller');

const assert = (cond, msg) => {
    if (!cond) throw new Error(`ASSERTION FAILED: ${msg}`);
    console.log(`  ✅ ${msg}`);
};

const fakeReqRes = (params, body, actingAdminId) => {
    const req = { params, body, user: { id: actingAdminId, type: 'admin' }, ip: '127.0.0.1' };
    let statusCode = 200;
    const res = {
        status(code) { statusCode = code; return this; },
        json(payload) { res._payload = payload; res._statusCode = statusCode; },
    };
    return { req, res };
};

async function run() {
    const suffix = Date.now();
    let testAdmin, actingAdmin;
    const auditIdsToClean = [];

    try {
        actingAdmin = await prisma.admin.findFirst({ where: { role: 'SUPER_ADMIN' } });
        if (!actingAdmin) throw new Error('Need at least one SUPER_ADMIN row to run this test.');

        testAdmin = await prisma.admin.create({
            data: {
                name: 'Test Role-Change Admin',
                email: `test-role-change-${suffix}@example.invalid`,
                passwordHash: await hashPassword('throwaway-password-not-used'),
                role: 'SUPPORT_AGENT',
                isActive: true,
            },
        });
        console.log(`\nCreated throwaway admin ${testAdmin.id} (role: SUPPORT_AGENT)\n`);

        // ── 1. Role change alone ────────────────────────────────────────
        console.log('1. Role change (SUPPORT_AGENT -> SUPER_ADMIN):');
        {
            const { req, res } = fakeReqRes({ id: testAdmin.id }, { role: 'SUPER_ADMIN' }, actingAdmin.id);
            await adminCtrl.updateAdmin(req, res, (e) => { throw e; });
        }
        const roleLogs = await prisma.auditLog.findMany({
            where: { entity: 'Admin', entityId: testAdmin.id, action: 'ADMIN_ACCESS_CHANGED' },
            orderBy: { createdAt: 'desc' },
        });
        assert(roleLogs.length === 1, 'an ADMIN_ACCESS_CHANGED audit row was created for the role change');
        assert(roleLogs[0].oldValue.role === 'SUPPORT_AGENT', 'oldValue.role correctly shows the PRIOR role');
        assert(roleLogs[0].newValue.role === 'SUPER_ADMIN', 'newValue.role correctly shows the escalated role');
        assert(roleLogs[0].adminId === actingAdmin.id, 'adminId records WHO made the change');
        auditIdsToClean.push(roleLogs[0].id);

        // ── 2. Non-role, non-status edit must NOT create this audit row ──
        console.log('\n2. Unrelated field edit (name only):');
        const before = await prisma.auditLog.count({ where: { entity: 'Admin', entityId: testAdmin.id, action: 'ADMIN_ACCESS_CHANGED' } });
        {
            const { req, res } = fakeReqRes({ id: testAdmin.id }, { name: 'Renamed Test Admin' }, actingAdmin.id);
            await adminCtrl.updateAdmin(req, res, (e) => { throw e; });
        }
        const after = await prisma.auditLog.count({ where: { entity: 'Admin', entityId: testAdmin.id, action: 'ADMIN_ACCESS_CHANGED' } });
        assert(after === before, 'no spurious ADMIN_ACCESS_CHANGED row for a name-only edit');

        // ── 3. isActive change (deactivation) ────────────────────────────
        console.log('\n3. isActive change (deactivation):');
        {
            const { req, res } = fakeReqRes({ id: testAdmin.id }, { isActive: false }, actingAdmin.id);
            await adminCtrl.updateAdmin(req, res, (e) => { throw e; });
        }
        const statusLogs = await prisma.auditLog.findMany({
            where: { entity: 'Admin', entityId: testAdmin.id, action: 'ADMIN_ACCESS_CHANGED' },
            orderBy: { createdAt: 'desc' }, take: 1,
        });
        assert(statusLogs.length === 1, 'a fresh ADMIN_ACCESS_CHANGED row was created for the isActive change');
        assert(statusLogs[0].oldValue.isActive === true, 'oldValue.isActive shows the account was previously active');
        assert(statusLogs[0].newValue.isActive === false, 'newValue.isActive shows the account is now deactivated');
        auditIdsToClean.push(statusLogs[0].id);

        console.log('\n✅ ALL CHECKS PASSED — admin role/status changes are now audited with old/new/who.\n');
    } finally {
        if (auditIdsToClean.length) {
            await prisma.auditLog.deleteMany({ where: { id: { in: auditIdsToClean } } }).catch(() => {});
        }
        if (testAdmin) {
            await prisma.auditLog.deleteMany({ where: { entity: 'Admin', entityId: testAdmin.id } }).catch(() => {});
            await prisma.admin.delete({ where: { id: testAdmin.id } }).catch(() => {});
        }
        console.log('Test admin + audit rows cleaned up.');
        await prisma.$disconnect();
    }
}

if (require.main === module) {
    run().catch(err => {
        console.error('\n❌', err.message);
        process.exitCode = 1;
    });
}
