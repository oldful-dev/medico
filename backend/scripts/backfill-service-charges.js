// One-off backfill: 10 services had no ServiceCharge row at any level
// (slug, category, serviceType), so checkout.controller.js silently fell
// back to hardcoded defaults (bookingFee: 299, platformFee: 50, tax: 18%)
// that are invisible in both admin panels. This creates an explicit
// SERVICE-scope row for each, keyed by its own slug (matching the format
// the admin panel's per-service override dropdown already generates:
// slug.toUpperCase().replace(/-/g, '_')), with serviceFee mirroring the
// service's real basePrice and the same 299/49/18% convention used by
// every other per-service override (e.g. Deep Cleaning, Grocery Delivery).
//
// Idempotent — skips any slug that already has a row.
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const SLUGS = [
  'home-essentials',
  'bill-payment',
  'bank-paperwork',
  'insurance',
  'order-medicines',
  'physio-fitness',
  'meal-service',
  'medical-equipment',
  'club-events',
  'yoga-meditation',
];

async function main() {
  for (const slug of SLUGS) {
    const service = await prisma.service.findFirst({ where: { slug } });
    if (!service) {
      console.log(`${slug} => SERVICE NOT FOUND, skipped`);
      continue;
    }

    const key = slug.toUpperCase().replace(/-/g, '_');
    const existing = await prisma.serviceCharge.findUnique({ where: { serviceCategory: key } });
    if (existing) {
      console.log(`${slug} => ${key} already exists, skipped`);
      continue;
    }

    const created = await prisma.serviceCharge.create({
      data: {
        serviceCategory: key,
        serviceFee: service.basePrice || 0,
        bookingFee: 299,
        platformFee: 49,
        taxPercentage: 18,
        isSubscriptionEligible: true,
        isActive: true,
        scope: 'SERVICE',
        serviceId: service.id,
        basePrice: service.basePrice || 0,
        pricingText: service.pricingText,
      },
    });
    console.log(`${slug} => created ${created.serviceCategory} (serviceFee: ${created.serviceFee})`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
