// Moves the 4 Quick Services strip tiles (Hospital Trip, Home Doctor,
// Nurse Care, Home Aide) from category: CARE to their own dedicated
// category: QUICK_SERVICES, now that a proper admin page
// (/quick-services) exists for them with full paymentMode/checkoutGroup
// control. Previously these were only reachable via Core Services
// (price/enable-only, no payment-mode control), which is why setting a
// price via Pricing had no visible effect on checkout — paymentMode was
// stuck at INQUIRY with no way to change it short of a script.
//
// Run: node scripts/migrate-care-to-quick-services.js
const prisma = require('../src/config/database');
const { syncDbServicesToUIConfig } = require('../src/utils/sduiSync');

const SLUGS = ['hospital-trip', 'doctor-visit', 'nurse-care', 'caregiver-support'];

async function main() {
    for (const slug of SLUGS) {
        const svc = await prisma.service.findUnique({ where: { slug } });
        if (!svc) {
            console.log(`No service with slug "${slug}" found — skipping.`);
            continue;
        }
        if (svc.category === 'QUICK_SERVICES') {
            console.log(`"${slug}" already category QUICK_SERVICES — skipping.`);
            continue;
        }
        await prisma.service.update({ where: { id: svc.id }, data: { category: 'QUICK_SERVICES' } });
        console.log(`Re-tagged "${svc.name}" (${slug}): ${svc.category} -> QUICK_SERVICES`);
    }

    console.log('Running sync...');
    await syncDbServicesToUIConfig();

    console.log('\nFinal QUICK_SERVICES services:');
    const all = await prisma.service.findMany({ where: { category: 'QUICK_SERVICES' }, select: { name: true, slug: true, paymentMode: true, checkoutGroup: true, basePrice: true } });
    all.forEach(s => console.log(`  ${s.name} (${s.slug}) — paymentMode: ${s.paymentMode}, checkoutGroup: ${s.checkoutGroup}, basePrice: ${s.basePrice}`));
}

main()
    .catch((e) => {
        console.error(e);
        process.exitCode = 1;
    })
    .finally(() => prisma.$disconnect());
