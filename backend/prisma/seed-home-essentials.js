const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const homeEssentialsServices = [
  {
    slug: 'appliance-repair',
    name: 'AC & Appliance Repair',
    headline: 'AC & Appliance Repair',
    subhead: 'Book a reliable technician for AC, refrigerator, washing machine and other household appliance repairs.',
    checkoutGroup: 'A',
    basePrice: 299,
    pricingText: '₹299 Service Charge + Vendor Bill',
    icon: '🛠️',
    route: '/appliance-repair',
    sortOrder: 1,
    serviceType: 'HOME_ESSENTIALS',
    isEnabled: true
  },
  {
    slug: 'plumbing-electrical',
    name: 'Plumbing & Electrical',
    headline: 'Plumbing & Electrical',
    subhead: 'Book a certified plumber or Electricians for pipe Leaks, wiring faults, and all other home repairs.',
    checkoutGroup: 'A',
    basePrice: 299,
    pricingText: '₹299 Service Charge + Vendor Bill',
    icon: '🚰',
    route: '/plumbing-electrical',
    sortOrder: 2,
    serviceType: 'HOME_ESSENTIALS',
    isEnabled: true
  },
  {
    slug: 'deep-cleaning',
    name: 'Deep Cleaning & Pest Control',
    headline: 'Deep Cleaning & Pest Control',
    subhead: 'Book professional deep cleaning or Pest Control for your Home. Safe & Certified.',
    checkoutGroup: 'D',
    basePrice: 0,
    pricingText: 'Submit Request',
    icon: '🧹',
    route: '/deep-cleaning',
    sortOrder: 3,
    serviceType: 'HOME_ESSENTIALS',
    isEnabled: true
  },
  {
    slug: 'tech-helper',
    name: 'Media & Tech Support',
    headline: 'Media & Tech Support',
    subhead: 'Simplifying smart tech configuration, device pairing, and audio visual setups.',
    checkoutGroup: 'C',
    basePrice: 499, // Online call base charge
    pricingText: '₹499 Online / ₹999 Home Visit',
    icon: '💻',
    route: '/tech-helper',
    sortOrder: 4,
    serviceType: 'HOME_ESSENTIALS',
    isEnabled: true
  },
  {
    slug: 'sanitisation',
    name: 'Washroom Sanitisation',
    headline: 'Washroom Sanitisation',
    subhead: 'Crafting a spotless, revitalised space with uncompromising safety standards.',
    checkoutGroup: 'D',
    basePrice: 0,
    pricingText: 'Submit Request',
    icon: '🧼',
    route: '/sanitisation',
    sortOrder: 5,
    serviceType: 'HOME_ESSENTIALS',
    isEnabled: true
  },
  {
    slug: 'driving-cab',
    name: 'Driver Request',
    headline: 'Driver Request',
    subhead: '24/7 Driver for Hospital visit, Errands or Any other destination. Safe & Comfortable.',
    checkoutGroup: 'D',
    basePrice: 0,
    pricingText: 'Submit Request',
    icon: '🚗',
    route: '/driving-cab',
    sortOrder: 6,
    serviceType: 'HOME_ESSENTIALS',
    isEnabled: true
  },
  {
    slug: 'grocery-run',
    name: 'Grocery Delivery',
    headline: 'Grocery Delivery',
    subhead: 'Share your Grocery list our Ayuxa buddy will shop from Your nearest store and deliver to you.',
    checkoutGroup: 'A',
    basePrice: 299,
    pricingText: '₹299 Service Charge + Vendor Bill',
    icon: '🛒',
    route: '/grocery-run',
    sortOrder: 7,
    serviceType: 'HOME_ESSENTIALS',
    isEnabled: true
  },
  {
    slug: 'bill-payment',
    name: 'Bill Payment',
    headline: 'Bill Payment',
    subhead: 'Share your Utility bill, our Ayuxa buddy take care Of Everything.',
    checkoutGroup: 'B',
    basePrice: 299,
    pricingText: '₹299 Service Charge (Max 2 Bills)',
    icon: '🧾',
    route: '/bill-payment',
    sortOrder: 8,
    serviceType: 'HOME_ESSENTIALS',
    isEnabled: true
  },
  {
    slug: 'paper-legal',
    name: 'Bank, Paper, Legal Work',
    headline: 'Bank, Paper, Legal Work',
    subhead: 'Get Professional help with bank visit, passbook updates, KYC and other paperwork. Pension, life certificate etc.',
    checkoutGroup: 'D',
    basePrice: 0,
    pricingText: 'Submit Request',
    icon: '🏦',
    route: '/paper-legal',
    sortOrder: 9,
    serviceType: 'HOME_ESSENTIALS',
    isEnabled: true
  },
  {
    slug: 'anything-else',
    name: 'Anything Else',
    headline: 'Anything Else',
    subhead: 'Need help with something not on our list? Tell us, what you need. Ayuxa buddy will handle it.',
    checkoutGroup: 'D',
    basePrice: 0,
    pricingText: 'Submit Request',
    icon: '❓',
    route: '/anything-else',
    sortOrder: 10,
    serviceType: 'HOME_ESSENTIALS',
    isEnabled: true
  }
];

async function main() {
  console.log('Starting seed operations...');

  // 1. Disable old bank-paperwork (consolidated under paper-legal)
  console.log('Disabling old paperwork/bank categories...');
  await prisma.service.updateMany({
    where: { slug: 'bank-paperwork' },
    data: { isEnabled: false }
  });

  // 2. Disable "Smart Upgrade", "Trip & Travels", "Tech Helper (Essentials)"
  console.log('Disabling Smart Upgrade and Trip & Travels...');
  await prisma.service.updateMany({
    where: {
      slug: { in: ['smart-upgrade', 'trip-travels', 'tech-helper-essentials'] }
    },
    data: { isEnabled: false }
  });

  // 3. Upsert our 10 Home Essentials services
  for (const svc of homeEssentialsServices) {
    console.log(`Upserting service: ${svc.name} (${svc.slug})`);
    await prisma.service.upsert({
      where: { slug: svc.slug },
      update: {
        name: svc.name,
        headline: svc.headline,
        subhead: svc.subhead,
        checkoutGroup: svc.checkoutGroup,
        basePrice: svc.basePrice,
        pricingText: svc.pricingText,
        icon: svc.icon,
        route: svc.route,
        sortOrder: svc.sortOrder,
        serviceType: svc.serviceType,
        isEnabled: svc.isEnabled
      },
      create: {
        slug: svc.slug,
        name: svc.name,
        headline: svc.headline,
        subhead: svc.subhead,
        checkoutGroup: svc.checkoutGroup,
        basePrice: svc.basePrice,
        pricingText: svc.pricingText,
        icon: svc.icon,
        route: svc.route,
        sortOrder: svc.sortOrder,
        serviceType: svc.serviceType,
        isEnabled: svc.isEnabled
      }
    });
  }

  // 4. Update corresponding ServiceCharge configurations for Group A and B
  const serviceCharges = [
    { category: 'APPLIANCE_REPAIR', bookingFee: 299, platformFee: 50 },
    { category: 'PLUMBING_ELECTRICAL', bookingFee: 299, platformFee: 50 },
    { category: 'GROCERY_RUN', bookingFee: 299, platformFee: 50 },
    { category: 'BILL_PAYMENT', bookingFee: 299, platformFee: 50 }
  ];

  for (const sc of serviceCharges) {
    console.log(`Upserting service charge fee config for ${sc.category}`);
    await prisma.serviceCharge.upsert({
      where: { serviceCategory: sc.category },
      update: {
        bookingFee: sc.bookingFee,
        platformFee: sc.platformFee,
        taxPercentage: 18,
        isSubscriptionEligible: true,
        isActive: true
      },
      create: {
        serviceCategory: sc.category,
        bookingFee: sc.bookingFee,
        platformFee: sc.platformFee,
        taxPercentage: 18,
        isSubscriptionEligible: true,
        isActive: true
      }
    });
  }

  console.log('Seed operations completed successfully!');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
