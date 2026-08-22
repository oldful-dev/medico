// One-off fix: Caregiver Support (slug: caregiver-support) had no dedicated
// ServiceCharge row, so checkout.controller.js's fallback cascade
// (slug -> category -> serviceType) matched it to the HOME_NURSE
// SERVICE_TYPE default (Nurse Care's shared config, serviceFee: 1999) and
// silently charged/displayed Nurse Care's price instead of its own.
//
// This creates a dedicated SERVICE-scope row keyed by its own slug
// (CAREGIVER_SUPPORT), matching the same key format the admin panel's
// per-service override dropdown already generates
// (slug.toUpperCase().replace(/-/g, '_')), so the direct slug match now
// succeeds before the cascade ever reaches HOME_NURSE.
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  const service = await prisma.service.findFirst({ where: { slug: 'caregiver-support' } });
  if (!service) {
    console.error('caregiver-support Service not found — aborting.');
    process.exitCode = 1;
    return;
  }

  const existing = await prisma.serviceCharge.findUnique({ where: { serviceCategory: 'CAREGIVER_SUPPORT' } });
  if (existing) {
    console.log('CAREGIVER_SUPPORT ServiceCharge row already exists — nothing to do.');
    return;
  }

  const created = await prisma.serviceCharge.create({
    data: {
      serviceCategory: 'CAREGIVER_SUPPORT',
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
  console.log('Created ServiceCharge row for Caregiver Support:', JSON.stringify(created, null, 2));
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
