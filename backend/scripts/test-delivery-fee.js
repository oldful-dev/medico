// ──────────────────────────────────────────────
//  Manual verification: dynamic, admin-configurable, payment-method-aware
//  wellness delivery fee — checkoutCart/getShippingRate now use it, the
//  config auto-seeds and is admin-editable, and historical orders keep
//  their originally-charged fee after the config changes.
//
//  Run manually: node scripts/test-delivery-fee.js
//  Creates throwaway rows on real dev DB tables, cleans up on success or
//  failure. Never calls real GCS/Cloudflare/Delhivery in a way that blocks
//  assertions (Delhivery serviceability lookup failure is already
//  non-fatal in getShippingRate/checkoutCart).
// ──────────────────────────────────────────────

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { getDeliveryFeeConfig, calculateDeliveryFee, DELIVERY_FEE_CONFIG_KEY } = require('../src/utils/deliveryFee');
const orderCtrl = require('../src/controllers/order.controller');

const assert = (cond, msg) => {
    if (!cond) throw new Error(`ASSERTION FAILED: ${msg}`);
    console.log(`  ✅ ${msg}`);
};

const fakeReqRes = (body, userId) => {
    const req = { body, user: { id: userId, type: 'user' } };
    let statusCode = 200;
    const res = {
        status(code) { statusCode = code; return this; },
        json(payload) { res._payload = payload; res._statusCode = statusCode; },
    };
    return { req, res };
};

async function run() {
    const suffix = Date.now();
    let user, category, cheapProduct, pricyProduct, order;

    try {
        // ── 0. Config auto-seed + update round-trip ─────────────────────
        console.log('0. Config auto-seed + admin update:');
        await prisma.uIConfig.deleteMany({ where: { key: DELIVERY_FEE_CONFIG_KEY } }); // start clean
        const seeded = await getDeliveryFeeConfig();
        assert(seeded.prepaidThreshold === 500 && seeded.prepaidFee === 99, 'auto-seeds the default prepaid rule (₹500 / ₹99)');
        assert(seeded.codThreshold === 1000 && seeded.codFee === 99, 'auto-seeds the default COD rule (₹1000 / ₹99)');

        // ── Setup: real user + products ──────────────────────────────────
        user = await prisma.user.findFirst();
        if (!user) throw new Error('Need at least one User row to run this test.');
        category = await prisma.category.create({ data: { name: `Test Cat ${suffix}`, slug: `test-cat-${suffix}` } });
        cheapProduct = await prisma.product.create({ data: { name: 'Cheap Item', categoryId: category.id, price: 200, mrp: 250, stock: 100 } });
        pricyProduct = await prisma.product.create({ data: { name: 'Pricy Item', categoryId: category.id, price: 1200, mrp: 1500, stock: 100 } });

        // ── 1. getShippingRate — prepaid, below ₹500 -> ₹99 ─────────────
        console.log('\n1. getShippingRate — prepaid, ₹200 (below ₹500 threshold):');
        {
            const { req, res } = fakeReqRes({ pincode: '560001', items: [{ productId: cheapProduct.id, quantity: 1 }], paymentMethod: 'UPI' }, user.id);
            await orderCtrl.getShippingRate(req, res, (e) => { throw e; });
            assert(res._payload.data.rate === 99, `preview fee is ₹99 (got ₹${res._payload.data.rate})`);
        }

        // ── 2. getShippingRate — COD, ₹200 (below ₹1000 COD threshold) -> ₹99 ──
        console.log('\n2. getShippingRate — COD, ₹200 (below ₹1000 COD threshold):');
        {
            const { req, res } = fakeReqRes({ pincode: '560001', items: [{ productId: cheapProduct.id, quantity: 1 }], paymentMethod: 'CASH' }, user.id);
            await orderCtrl.getShippingRate(req, res, (e) => { throw e; });
            assert(res._payload.data.rate === 99, `COD preview fee is ₹99 (got ₹${res._payload.data.rate})`);
        }

        // ── 3. getShippingRate — prepaid, ₹1200 (above ₹500) -> ₹0 ─────
        console.log('\n3. getShippingRate — prepaid, ₹1200 (above ₹500 prepaid threshold):');
        {
            const { req, res } = fakeReqRes({ pincode: '560001', items: [{ productId: pricyProduct.id, quantity: 1 }], paymentMethod: 'UPI' }, user.id);
            await orderCtrl.getShippingRate(req, res, (e) => { throw e; });
            assert(res._payload.data.rate === 0, `preview fee is ₹0 (got ₹${res._payload.data.rate})`);
        }

        // ── 4. getShippingRate — COD, ₹1200 (above ₹1000 COD) -> ₹0, but prepaid on same amount would be ₹0 too — use a value between 500 and 1000 to actually distinguish COD vs prepaid ──
        console.log('\n4. getShippingRate — same ₹700 cart: prepaid -> ₹0, COD -> ₹99 (proves the two thresholds are genuinely independent):');
        const midProduct = await prisma.product.create({ data: { name: 'Mid Item', categoryId: category.id, price: 700, mrp: 800, stock: 100 } });
        {
            const { req, res } = fakeReqRes({ pincode: '560001', items: [{ productId: midProduct.id, quantity: 1 }], paymentMethod: 'UPI' }, user.id);
            await orderCtrl.getShippingRate(req, res, (e) => { throw e; });
            assert(res._payload.data.rate === 0, `₹700 prepaid -> ₹0 (got ₹${res._payload.data.rate})`);
        }
        {
            const { req, res } = fakeReqRes({ pincode: '560001', items: [{ productId: midProduct.id, quantity: 1 }], paymentMethod: 'CASH' }, user.id);
            await orderCtrl.getShippingRate(req, res, (e) => { throw e; });
            assert(res._payload.data.rate === 99, `₹700 COD -> ₹99 (got ₹${res._payload.data.rate})`);
        }
        await prisma.product.delete({ where: { id: midProduct.id } });

        // ── 5. checkoutCart persists the same fee as the preview ────────
        console.log('\n5. checkoutCart — prepaid, ₹200 cart persists shippingCharge=99:');
        {
            const { req, res } = fakeReqRes({
                items: [{ productId: cheapProduct.id, quantity: 1 }],
                pincode: '560001',
                paymentMethod: 'UPI',
            }, user.id);
            req.user.name = user.name;
            await orderCtrl.checkoutCart(req, res, (e) => { throw e; });
            assert(res._statusCode !== 400, `checkout succeeded (status ${res._statusCode})`);
            order = res._payload?.data?.order;
            assert(!!order, 'order was created');
            assert(order.shippingCharge === 99, `persisted shippingCharge is ₹99 (got ₹${order?.shippingCharge})`);
        }

        // ── 6. Changing the config afterward does NOT alter the historical order ──
        console.log('\n6. Config change does not retroactively alter the already-created order:');
        await prisma.uIConfig.update({
            where: { key: DELIVERY_FEE_CONFIG_KEY },
            data: { configJson: { prepaidThreshold: 100, prepaidFee: 49, codThreshold: 1000, codFee: 99 } },
        });
        const reread = await prisma.productOrder.findUnique({ where: { id: order.id } });
        assert(reread.shippingCharge === 99, `historical order's shippingCharge is still ₹99 after the config changed (got ₹${reread.shippingCharge})`);

        // Restore default config for anyone else running this script later
        await prisma.uIConfig.update({
            where: { key: DELIVERY_FEE_CONFIG_KEY },
            data: { configJson: { prepaidThreshold: 500, prepaidFee: 99, codThreshold: 1000, codFee: 99 } },
        });

        console.log('\n✅ ALL CHECKS PASSED — dynamic delivery fee works end-to-end, historical orders are unaffected by later config changes.\n');
    } finally {
        if (order) await prisma.productOrder.delete({ where: { id: order.id } }).catch(() => {});
        if (cheapProduct) await prisma.product.delete({ where: { id: cheapProduct.id } }).catch(() => {});
        if (pricyProduct) await prisma.product.delete({ where: { id: pricyProduct.id } }).catch(() => {});
        if (category) await prisma.category.delete({ where: { id: category.id } }).catch(() => {});
        console.log('Test rows cleaned up.');
        await prisma.$disconnect();
    }
}

if (require.main === module) {
    run().catch(err => {
        console.error('\n❌', err.message);
        process.exitCode = 1;
    });
}
