// One-off fix: the "Plumbing & Electrical" service (route /plumbing-electrical)
// was edited in admin on 2026-09-20 to slug "electrician" with
// isDynamic:true, orphaning the hardcoded mobile screen
// (mobile/app/plumbing-electrical/index.tsx), which is hardcoded to
// slug="plumbing" — the exact bug class fixed earlier this session,
// regressed by a direct admin edit that bypassed the slug lock (only
// possible because isDynamic was flipped to true, which unlocks the
// slug field).
//
// Run manually:
//   cd backend
//   node scripts/fix-plumbing-slug-regression.js
const prisma = require('../src/config/database');

const SERVICE_ID = '99bec8bf-82d5-4d18-8569-d7663786137b';

async function main() {
    const before = await prisma.service.findUnique({ where: { id: SERVICE_ID }, select: { slug: true, isDynamic: true, route: true } });
    console.log('Before:', before);

    const updated = await prisma.service.update({
        where: { id: SERVICE_ID },
        data: { slug: 'plumbing', isDynamic: false },
    });
    console.log('After:', { slug: updated.slug, isDynamic: updated.isDynamic, route: updated.route });
}

main()
    .catch((e) => { console.error(e); process.exitCode = 1; })
    .finally(() => prisma.$disconnect());
