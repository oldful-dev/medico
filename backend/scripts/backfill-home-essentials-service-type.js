// One-off: DynamicServiceFormModal never set serviceType based on which
// page created the service until it was fixed (commit "Fix Choose File
// button..." session) — every service created via the Home Essentials page
// before that fix was saved with serviceType: "OTHER" instead of
// "HOME_ESSENTIALS". HomeEssentialsPage.jsx's list (and mobile's Home
// Essentials grid) both filter strictly on serviceType === "HOME_ESSENTIALS",
// so these rows exist correctly in the DB but are invisible everywhere.
//
// This backfills serviceType for any service with category === "HOME_ESSENTIALS"
// whose serviceType isn't already "HOME_ESSENTIALS" — mirrors what the fixed
// modal does automatically for new services going forward.
//
// Run: node scripts/backfill-home-essentials-service-type.js
const prisma = require('../src/config/database');
const { syncDbServicesToUIConfig } = require('../src/utils/sduiSync');

async function main() {
    const mismatched = await prisma.service.findMany({
        where: { category: 'HOME_ESSENTIALS', serviceType: { not: 'HOME_ESSENTIALS' } },
        select: { id: true, name: true, slug: true, serviceType: true },
    });

    if (mismatched.length === 0) {
        console.log('No mismatched HOME_ESSENTIALS services found — nothing to fix.');
        return;
    }

    console.log(`Found ${mismatched.length} service(s) to fix:`);
    mismatched.forEach(s => console.log(`  ${s.name} (${s.slug}) — serviceType was "${s.serviceType}"`));

    await prisma.service.updateMany({
        where: { id: { in: mismatched.map(s => s.id) } },
        data: { serviceType: 'HOME_ESSENTIALS' },
    });

    console.log('Fixed. Running sync...');
    await syncDbServicesToUIConfig();
    console.log('Done.');
}

main()
    .catch((e) => {
        console.error(e);
        process.exitCode = 1;
    })
    .finally(() => prisma.$disconnect());
