// Fixes a real booking-blocking bug: 4 pre-existing native screens
// (meal-service, medical-equipment, order-medicines, scan-ecg) call
// useServiceInitialization() with a plain slug that matches their own
// route/folder name — but the Service rows backfilled for the Diagnostics
// & Fitness admin page earlier this session used "-diag" suffixed slugs
// instead (to avoid what looked like a naming collision at the time). The
// mismatch means serviceId never resolves, isReady stays false forever,
// and every booking attempt on these screens fails with "Service
// initialization incomplete. Please try again." (mobile/app/hospital-trip/
// index.tsx and 3 other screens share this exact failure mode — see
// physio-diag/fitness-diag, already fixed by updating physio/index.tsx and
// fitness/index.tsx instead, since those two screens' expected slugs
// ("physio-fitness"/"fitness-wellness") never existed as real rows at all).
//
// Run: node scripts/fix-diagnostics-slug-mismatch.js
const prisma = require('../src/config/database');
const { syncDbServicesToUIConfig } = require('../src/utils/sduiSync');

const RENAMES = [
    { from: 'meal-service-diag', to: 'meal-service' },
    { from: 'medical-equipment-diag', to: 'medical-equipment' },
    { from: 'order-medicine-diag', to: 'order-medicines' },
    { from: 'scan-ecg-diag', to: 'scan-ecg' },
];

async function main() {
    for (const { from, to } of RENAMES) {
        const svc = await prisma.service.findUnique({ where: { slug: from } });
        if (!svc) {
            console.log(`No service with slug "${from}" found — skipping.`);
            continue;
        }
        const collision = await prisma.service.findUnique({ where: { slug: to } });
        if (collision) {
            console.log(`REFUSING to rename "${from}" -> "${to}": a service with slug "${to}" already exists (id: ${collision.id}, name: "${collision.name}"). Resolve manually.`);
            continue;
        }
        await prisma.service.update({ where: { id: svc.id }, data: { slug: to } });
        console.log(`Renamed "${svc.name}": ${from} -> ${to}`);
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
