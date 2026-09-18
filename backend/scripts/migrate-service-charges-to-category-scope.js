// Migrates the last remaining per-service ServiceCharge rows (scope:
// SERVICE, keyed by an ad-hoc slug string) into proper category-level rows
// (scope: CATEGORY, keyed by one of the 4 real Service.category values).
// Pricing is now category-only going forward (see serviceCharge.controller.js)
// — this brings existing production data in line so there's no leftover
// legacy shape.
//
//   NURSE_CARE (nurse-care's fee)    -> CARE
//   TRIP       (trip-travels' fee)   -> TOURS_TRAVEL
//   HOME_ESSENTIALS (already correctly named, wrong scope/serviceId) -> fixed in place
//
// If a target category row already exists, the legacy row's fee values are
// left untouched and only reported — never silently overwritten.
//
// Run: node scripts/migrate-service-charges-to-category-scope.js
const prisma = require('../src/config/database');

const RENAMES = [
    { from: 'NURSE_CARE', to: 'CARE' },
    { from: 'TRIP', to: 'TOURS_TRAVEL' },
];

async function main() {
    for (const { from, to } of RENAMES) {
        const legacy = await prisma.serviceCharge.findUnique({ where: { serviceCategory: from } });
        if (!legacy) {
            console.log(`No legacy row "${from}" found — skipping.`);
            continue;
        }
        const targetExists = await prisma.serviceCharge.findUnique({ where: { serviceCategory: to } });
        if (targetExists) {
            console.log(`Target "${to}" already has a config — NOT overwriting. Legacy row "${from}" left as-is; review/delete manually.`);
            continue;
        }
        await prisma.serviceCharge.update({
            where: { id: legacy.id },
            data: { serviceCategory: to, scope: 'CATEGORY', serviceId: null },
        });
        console.log(`Migrated "${from}" -> "${to}" (scope: CATEGORY).`);
    }

    // HOME_ESSENTIALS already has the right key — just fix scope/serviceId.
    const homeEssentials = await prisma.serviceCharge.findUnique({ where: { serviceCategory: 'HOME_ESSENTIALS' } });
    if (homeEssentials && (homeEssentials.scope !== 'CATEGORY' || homeEssentials.serviceId)) {
        await prisma.serviceCharge.update({
            where: { id: homeEssentials.id },
            data: { scope: 'CATEGORY', serviceId: null },
        });
        console.log('Fixed "HOME_ESSENTIALS" row: scope -> CATEGORY, cleared stray serviceId.');
    }

    console.log('\nFinal ServiceCharge rows:');
    const all = await prisma.serviceCharge.findMany({ select: { serviceCategory: true, scope: true, serviceFee: true, isActive: true } });
    all.forEach(c => console.log(`  ${c.serviceCategory} (scope: ${c.scope}, fee: ${c.serviceFee}, active: ${c.isActive})`));
}

main()
    .catch((e) => {
        console.error(e);
        process.exitCode = 1;
    })
    .finally(() => prisma.$disconnect());
