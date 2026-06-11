const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('Seeding sample dynamic service...');
  
  const sampleService = {
    slug: 'yoga-meditation',
    name: 'Yoga & Meditation',
    headline: 'Yoga & Meditation Session',
    subhead: 'Book a certified yoga instructor for personalized or group sessions at home.',
    checkoutGroup: 'D',
    basePrice: 0,
    pricingText: 'Submit Inquiry',
    icon: '🧘',
    route: '/dynamic-service/yoga-meditation',
    sortOrder: 15,
    serviceType: 'PHYSIO_FITNESS',
    isEnabled: true,
    isDynamic: true,
    category: 'DIAGNOSTICS_FITNESS',
    paymentMode: 'INQUIRY'
  };

  console.log(`Upserting dynamic service: ${sampleService.name} (${sampleService.slug})`);
  const service = await prisma.service.upsert({
    where: { slug: sampleService.slug },
    update: {
      name: sampleService.name,
      headline: sampleService.headline,
      subhead: sampleService.subhead,
      checkoutGroup: sampleService.checkoutGroup,
      basePrice: sampleService.basePrice,
      pricingText: sampleService.pricingText,
      icon: sampleService.icon,
      route: sampleService.route,
      sortOrder: sampleService.sortOrder,
      serviceType: sampleService.serviceType,
      isEnabled: sampleService.isEnabled,
      isDynamic: sampleService.isDynamic,
      category: sampleService.category,
      paymentMode: sampleService.paymentMode
    },
    create: {
      slug: sampleService.slug,
      name: sampleService.name,
      headline: sampleService.headline,
      subhead: sampleService.subhead,
      checkoutGroup: sampleService.checkoutGroup,
      basePrice: sampleService.basePrice,
      pricingText: sampleService.pricingText,
      icon: sampleService.icon,
      route: sampleService.route,
      sortOrder: sampleService.sortOrder,
      serviceType: sampleService.serviceType,
      isEnabled: sampleService.isEnabled,
      isDynamic: sampleService.isDynamic,
      category: sampleService.category,
      paymentMode: sampleService.paymentMode
    }
  });

  console.log('Successfully seeded sample dynamic service:', service);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
