// One-time cleanup: the ServiceCharge table had 51 rows for 21 real
// services (duplicates like AC_REPAIR/AC_REPAIR_, junk TEST/TEST2/XYZ rows,
// never-cleaned experiments). Deletes everything and reseeds exactly one
// row per real, enabled service — keyed by that service's slug, matching
// what calculateCheckout actually resolves. Request-based services (the
// existing basePrice=0 + "Submit Request"-style pricingText convention)
// get isRequestBased: true instead of a fake ₹0 fee.
//
// Run once: node scripts/rebuild-pricing-engine.js
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const REQUEST_BASED_TEXT_PATTERNS = [/submit request/i, /inquiry/i, /as per mrp/i, /varies/i];

async function main() {
    const services = await prisma.service.findMany({
        where: { isEnabled: true },
        select: { id: true, name: true, slug: true, basePrice: true, pricingText: true },
    });

    // Skip obvious junk/test services left in the catalog — not this
    // script's job to clean up Service rows, only ServiceCharge rows.
    const JUNK_SLUGS = ['test', 'test2', 'travel', 'xyz'];
    const realServices = services.filter(s => !JUNK_SLUGS.includes((s.slug || '').toLowerCase()));

    const deleted = await prisma.serviceCharge.deleteMany({});
    console.log(`Deleted ${deleted.count} existing ServiceCharge rows.`);

    let created = 0;
    for (const s of realServices) {
        const isRequestBased = (!s.basePrice || s.basePrice === 0) &&
            REQUEST_BASED_TEXT_PATTERNS.some(re => re.test(s.pricingText || ''));

        const serviceCategory = s.slug.toUpperCase().replace(/-/g, '_');
        await prisma.serviceCharge.create({
            data: {
                serviceCategory,
                serviceId: s.id,
                scope: 'SERVICE',
                serviceFee: isRequestBased ? 0 : (s.basePrice || 0),
                isRequestBased,
                bookingFee: 299,
                platformFee: 50,
                taxPercentage: 18,
                isSubscriptionEligible: true,
                isActive: true,
            },
        });
        created++;
        console.log(`  + ${serviceCategory} (${s.name})${isRequestBased ? ' — request-based' : ` — ₹${s.basePrice || 0}`}`);
    }

    console.log(`\nCreated ${created} clean ServiceCharge rows for ${realServices.length} real services.`);
    await prisma.$disconnect();
}

main().catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
});
