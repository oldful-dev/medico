// ──────────────────────────────────────────────
//  Manual verification: a failed auto-fulfillment attempt is persisted
//  (fulfillmentError set) and StatusTransitionLog records it — not just a
//  vanished log line. Then confirms the retry path is idempotent once
//  fulfilled (doesn't re-call Delhivery / doesn't error on an
//  already-fulfilled order).
//
//  Run manually: node scripts/test-fulfillment-failure-visibility.js
//  Cleans up its own test rows, including on failure.
// ──────────────────────────────────────────────

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { attemptFulfillment } = require('../src/services/fulfillment.service');

const assert = (cond, msg) => {
    if (!cond) throw new Error(`ASSERTION FAILED: ${msg}`);
    console.log(`  ✅ ${msg}`);
};

async function run() {
    const suffix = Date.now();
    let user, product, order;

    try {
        user = await prisma.user.findFirst();
        product = await prisma.product.findFirst();
        if (!user || !product) throw new Error('Need at least one User and one Product row to run this test.');

        order = await prisma.productOrder.create({
            data: {
                orderCode: `TEST-FULFILL-${suffix}`,
                userId: user.id,
                productId: product.id,
                quantity: 1,
                amount: 500,
                status: 'PAID',
                address: JSON.stringify({ line1: '1 Test St', city: 'Bangalore', pincode: '560001', state: 'Karnataka' }),
            },
        });
        console.log(`\nCreated test order ${order.orderCode} (${order.id})\n`);

        // ── 1. Attempt fulfillment — expected to fail (Delhivery not configured in this env) ──
        console.log('Attempt 1 (expected failure):');
        const result1 = await attemptFulfillment(order.id, 'test-script');
        assert(result1.success === false, 'attemptFulfillment() reports failure');

        const afterFail = await prisma.productOrder.findUnique({ where: { id: order.id } });
        assert(!!afterFail.fulfillmentError, 'fulfillmentError is persisted on the order (not just logged)');
        assert(!!afterFail.fulfillmentFailedAt, 'fulfillmentFailedAt timestamp is set');
        assert(!afterFail.shiprocketOrderId, 'shiprocketOrderId remains null after a failed attempt');

        const logs1 = await prisma.statusTransitionLog.findMany({
            where: { entityType: 'ProductOrder', entityId: order.id },
            orderBy: { createdAt: 'desc' },
        });
        assert(logs1.length > 0, 'StatusTransitionLog has a row for the failed attempt');
        assert(/fulfillment failed/i.test(logs1[0].reason || ''), `log reason describes the failure (got: "${logs1[0].reason}")`);

        // ── 2. Simulate a successful fulfillment directly (bypassing the
        //      real Delhivery call, which isn't configured in this env) to
        //      verify the retry-idempotency guard afterward. ──
        await prisma.productOrder.update({
            where: { id: order.id },
            data: { shiprocketOrderId: 'SIMULATED-SR-ID', fulfillmentError: null, fulfillmentFailedAt: null },
        });
        console.log('\nSimulated a successful fulfillment (shiprocketOrderId set).\n');

        // ── 3. Retry after "success" — must be a safe no-op, not a duplicate attempt ──
        console.log('Attempt 2 (already fulfilled — must be idempotent no-op):');
        const result2 = await attemptFulfillment(order.id, 'test-script');
        assert(result2.success === true && result2.alreadyFulfilled === true, 'attemptFulfillment() recognizes an already-fulfilled order and does not re-attempt');

        const afterRetry = await prisma.productOrder.findUnique({ where: { id: order.id } });
        assert(afterRetry.shiprocketOrderId === 'SIMULATED-SR-ID', 'shiprocketOrderId is unchanged — no duplicate shipment was created');

        console.log('\n✅ ALL CHECKS PASSED — failed fulfillment is persisted/visible, retry is idempotent.\n');
    } finally {
        if (order) {
            await prisma.statusTransitionLog.deleteMany({ where: { entityType: 'ProductOrder', entityId: order.id } }).catch(() => {});
            await prisma.productOrder.delete({ where: { id: order.id } }).catch(() => {});
            console.log('Test rows cleaned up.');
        }
        await prisma.$disconnect();
    }
}

if (require.main === module) {
    run().catch(err => {
        console.error('\n❌', err.message);
        process.exitCode = 1;
    });
}
