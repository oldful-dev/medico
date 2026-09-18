// Backfills real Service rows for the 3 Diagnostics & Fitness home-screen
// tiles that only ever existed as home_config entries with no backing
// record: Insurance, Equipments, Home Meal. Same pattern as the earlier
// Blood Work / Scan & ECG / Medicine / Fitness / Physio backfill — these
// show on the live app's grid but weren't manageable from
// /diagnostic-fitness at all.
//
// Insurance intentionally gets category: DIAGNOSTICS_FITNESS (not a
// separate "core-only" category) so sduiSync.js's categoryGroupedModule
// branch keeps recognizing it as belonging to this section — the
// alternative (a different category) would silently drop it from the
// mobile grid on the next sync. It's isDynamic: false, so it also appears
// on the Core Services page (filtered on !isDynamic, no category check).
//
// Run: node scripts/backfill-diagnostics-fitness-services.js
const prisma = require('../src/config/database');
const { syncDbServicesToUIConfig } = require('../src/utils/sduiSync');

const NEW_SERVICES = [
    { name: 'Insurance', slug: 'insurance-diag', route: '/insurance', icon: '🛡️', sortOrder: 6 },
    { name: 'Equipments', slug: 'medical-equipment-diag', route: '/medical-equipment', icon: '🩼', sortOrder: 7 },
    { name: 'Home Meal', slug: 'meal-service-diag', route: '/meal-service', icon: '🍽️', sortOrder: 8 },
];

async function main() {
    for (const svc of NEW_SERVICES) {
        const existing = await prisma.service.findUnique({ where: { slug: svc.slug } });
        if (existing) {
            console.log(`Service "${svc.slug}" already exists — skipping.`);
            continue;
        }
        await prisma.service.create({
            data: {
                name: svc.name,
                slug: svc.slug,
                icon: svc.icon,
                route: svc.route,
                headline: svc.name,
                subhead: svc.name,
                sortOrder: svc.sortOrder,
                isEnabled: true,
                isDynamic: false,
                category: 'DIAGNOSTICS_FITNESS',
                serviceType: 'OTHER',
                paymentMode: 'INQUIRY',
                basePrice: 0,
            },
        });
        console.log(`Created Service "${svc.name}" (${svc.slug}).`);
    }

    console.log('Running sync...');
    await syncDbServicesToUIConfig();

    console.log('\nFinal DIAGNOSTICS_FITNESS services:');
    const all = await prisma.service.findMany({ where: { category: 'DIAGNOSTICS_FITNESS' }, select: { name: true, slug: true, route: true } });
    all.forEach(s => console.log(`  ${s.name} (${s.slug}) -> ${s.route}`));
}

main()
    .catch((e) => {
        console.error(e);
        process.exitCode = 1;
    })
    .finally(() => prisma.$disconnect());
