// Seeds/updates the Medical Tourism enquiry service — a single paid
// consultation service (isDynamic: false) rendered by a dedicated hardcoded
// screen (mobile/app/medical-tourism/index.tsx), per the "Ayuxa Medical
// Tourism" spec (Medical Tourism.pdf): patient info, medical requirement,
// optional document upload, travel/support needs, consent, then a flat
// ₹2,999 consultation fee. No home-screen tile is added here — per explicit
// decision this session, that's done manually via Server UI to avoid
// touching the shared home_config sync code that caused real production
// corruption incidents earlier.
//
// Run: node scripts/seed-medical-tourism.js
const prisma = require('../src/config/database');

const SERVICE_DATA = {
    name: 'Medical Tourism',
    slug: 'medical-tourism',
    icon: '🌍',
    route: '/medical-tourism',
    headline: 'Ayuxa Medical Tourism',
    subhead: 'Connect with India\'s leading hospitals and specialists',
    description: 'Ayuxa helps international patients connect with suitable Indian hospitals, doctors, diagnostics, treatment providers, and support services.',
    tagline: 'International Patient Care Coordination',
    sortOrder: 1,
    isEnabled: true,
    isDynamic: false,
    category: 'MEDICAL_TOURISM',
    serviceType: 'OTHER',
    paymentMode: 'PAID',
    checkoutGroup: 'A',
    basePrice: 2999,
};

async function main() {
    const existing = await prisma.service.findUnique({ where: { slug: 'medical-tourism' } });
    if (existing) {
        // Was seeded as isDynamic:true with a formFieldsJson earlier this
        // session, before the decision to build a hardcoded screen instead —
        // clear that out so it doesn't accidentally get picked up anywhere.
        await prisma.service.update({
            where: { slug: 'medical-tourism' },
            data: { ...SERVICE_DATA, formFieldsJson: null },
        });
        console.log('Updated existing "medical-tourism" service (isDynamic set to false, route updated).');
        process.exit(0);
    }

    const service = await prisma.service.create({ data: SERVICE_DATA });
    console.log(`Created Service "Medical Tourism" (${service.slug}), id: ${service.id}`);
}

main()
    .catch((e) => {
        console.error(e);
        process.exitCode = 1;
    })
    .finally(() => prisma.$disconnect());
