// ──────────────────────────────────────────────
//  Manual verification: price/fee changes on Service, ServiceCharge, and
//  Product now produce real AuditLog rows (oldValue/newValue/adminId/reason),
//  and a non-price-only edit does NOT create a spurious price-audit row.
//
//  Run manually: node scripts/test-price-audit-trail.js
//  Restores original values and cleans up its own audit rows, including on
//  failure.
// ──────────────────────────────────────────────

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const serviceCtrl = require('../src/controllers/service.controller');
const serviceChargeCtrl = require('../src/controllers/serviceCharge.controller');
const storeCtrl = require('../src/controllers/store.controller');

const assert = (cond, msg) => {
    if (!cond) throw new Error(`ASSERTION FAILED: ${msg}`);
    console.log(`  ✅ ${msg}`);
};

// Minimal fake req/res — controllers here only use req.body/req.params/req.user/req.ip and res.json/res.status.
const fakeReqRes = (params, body, adminId) => {
    const req = { params, body, user: { id: adminId, type: 'admin' }, ip: '127.0.0.1' };
    let statusCode = 200;
    const res = {
        status(code) { statusCode = code; return this; },
        json(payload) { res._payload = payload; res._statusCode = statusCode; },
    };
    return { req, res };
};

async function run() {
    const suffix = Date.now();
    let service, charge, product, admin;
    const auditIdsToClean = [];

    try {
        service = await prisma.service.findFirst({ where: { basePrice: { gt: 0 } } });
        charge = await prisma.serviceCharge.findFirst();
        product = await prisma.product.findFirst();
        admin = await prisma.admin.findFirst();
        if (!service || !charge || !product || !admin) {
            throw new Error('Need at least one Service (with basePrice>0), ServiceCharge, Product, and Admin row to run this test.');
        }

        const origServiceBasePrice = service.basePrice;
        const origChargeServiceFee = charge.serviceFee;
        const origProductPrice = product.price;
        const origProductMrp = product.mrp;

        // ── 1. Service.basePrice change WITH a reason ──────────────────────
        console.log('\n1. Service.basePrice update:');
        const newServicePrice = origServiceBasePrice + 11;
        {
            const { req, res } = fakeReqRes({ id: service.id }, { basePrice: newServicePrice, changeReason: `test-${suffix}` }, admin.id);
            await serviceCtrl.updateService(req, res, (e) => { throw e; });
        }
        const serviceLogs = await prisma.auditLog.findMany({
            where: { entity: 'Service', entityId: service.id, action: 'SERVICE_PRICE_UPDATED' },
            orderBy: { createdAt: 'desc' }, take: 1,
        });
        assert(serviceLogs.length === 1, 'a SERVICE_PRICE_UPDATED audit row was created');
        assert(serviceLogs[0].oldValue.basePrice === origServiceBasePrice, 'oldValue.basePrice matches the pre-update price');
        assert(serviceLogs[0].newValue.basePrice === newServicePrice, 'newValue.basePrice matches the new price');
        assert(serviceLogs[0].newValue.reason === `test-${suffix}`, 'reason was persisted');
        assert(serviceLogs[0].adminId === admin.id, 'adminId recorded');
        auditIdsToClean.push(serviceLogs[0].id);

        // Cascade: ServiceCharge sync should also be audited
        const cascadeLogs = await prisma.auditLog.findMany({
            where: { entity: 'ServiceCharge', action: 'PRICE_SYNC' },
            orderBy: { createdAt: 'desc' }, take: 1,
        });
        if (cascadeLogs.length && cascadeLogs[0].newValue?.syncedFrom === `Service:${service.id}`) {
            assert(true, 'the ServiceCharge cascade sync was also audited (PRICE_SYNC)');
            auditIdsToClean.push(cascadeLogs[0].id);
        } else {
            console.log('  ℹ️  (no matching ServiceCharge row existed for this service — cascade sync skipped, expected)');
        }

        // ── 2. Non-price edit must NOT create a price-audit row ────────────
        console.log('\n2. Non-price Service edit (isEnabled toggle only):');
        const beforeCount = await prisma.auditLog.count({ where: { entity: 'Service', entityId: service.id, action: 'SERVICE_PRICE_UPDATED' } });
        {
            const { req, res } = fakeReqRes({ id: service.id }, { isEnabled: service.isEnabled }, admin.id); // no-op value, no basePrice field at all
            await serviceCtrl.updateService(req, res, (e) => { throw e; });
        }
        const afterCount = await prisma.auditLog.count({ where: { entity: 'Service', entityId: service.id, action: 'SERVICE_PRICE_UPDATED' } });
        assert(afterCount === beforeCount, 'no spurious SERVICE_PRICE_UPDATED row created for a non-price edit');

        // ── 3. ServiceCharge fee change WITH a reason ──────────────────────
        console.log('\n3. ServiceCharge.serviceFee update:');
        const newChargeFee = origChargeServiceFee + 7;
        {
            const { req, res } = fakeReqRes({ id: charge.id }, { serviceFee: newChargeFee, changeReason: `test-${suffix}` }, admin.id);
            await serviceChargeCtrl.updateServiceCharge(req, res, (e) => { throw e; });
        }
        const chargeLogs = await prisma.auditLog.findMany({
            where: { entity: 'ServiceCharge', entityId: charge.id, action: 'SERVICE_CHARGE_UPDATED' },
            orderBy: { createdAt: 'desc' }, take: 1,
        });
        assert(chargeLogs.length === 1, 'a SERVICE_CHARGE_UPDATED audit row was created');
        assert(chargeLogs[0].oldValue.serviceFee === origChargeServiceFee, 'oldValue.serviceFee matches the pre-update fee');
        assert(chargeLogs[0].newValue.serviceFee === newChargeFee, 'newValue.serviceFee matches the new fee');
        assert(chargeLogs[0].newValue.reason === `test-${suffix}`, 'reason was persisted');
        auditIdsToClean.push(chargeLogs[0].id);

        // ── 4. Product.price change WITH a reason ──────────────────────────
        console.log('\n4. Product.price update:');
        const newProductPrice = origProductPrice + 13;
        {
            const { req, res } = fakeReqRes({ id: product.id }, { price: newProductPrice, changeReason: `test-${suffix}` }, admin.id);
            await storeCtrl.updateProduct(req, res, (e) => { throw e; });
        }
        const productLogs = await prisma.auditLog.findMany({
            where: { entity: 'Product', entityId: product.id, action: 'PRODUCT_PRICE_UPDATED' },
            orderBy: { createdAt: 'desc' }, take: 1,
        });
        assert(productLogs.length === 1, 'a PRODUCT_PRICE_UPDATED audit row was created (previously: zero audit trail existed for this route at all)');
        assert(productLogs[0].oldValue.price === origProductPrice, 'oldValue.price matches the pre-update price');
        assert(productLogs[0].newValue.price === newProductPrice, 'newValue.price matches the new price');
        assert(productLogs[0].newValue.reason === `test-${suffix}`, 'reason was persisted');
        auditIdsToClean.push(productLogs[0].id);

        // ── Restore original values ─────────────────────────────────────
        await prisma.service.update({ where: { id: service.id }, data: { basePrice: origServiceBasePrice } });
        await prisma.serviceCharge.update({ where: { id: charge.id }, data: { serviceFee: origChargeServiceFee } });
        await prisma.product.update({ where: { id: product.id }, data: { price: origProductPrice, mrp: origProductMrp } });
        console.log('\nOriginal values restored.');

        console.log('\n✅ ALL CHECKS PASSED — price/fee changes are now audited with old/new/admin/reason.\n');
    } finally {
        if (auditIdsToClean.length) {
            await prisma.auditLog.deleteMany({ where: { id: { in: auditIdsToClean } } }).catch(() => {});
        }
        console.log('Test audit rows cleaned up.');
        await prisma.$disconnect();
    }
}

if (require.main === module) {
    run().catch(err => {
        console.error('\n❌', err.message);
        process.exitCode = 1;
    });
}
