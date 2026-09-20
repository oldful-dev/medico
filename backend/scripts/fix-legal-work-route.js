// "Legal Work" (slug: legal-work, Home Essentials, isDynamic: true) had its
// route stuck at /meetup — almost certainly picked from RouteSelector's
// dropdown by mistake while editing, since /meetup was a valid option in
// that list. Confirmed live in the admin form's "Service Route Path" field.
// Run: node scripts/fix-legal-work-route.js
const prisma = require('../src/config/database');

async function main() {
    const svc = await prisma.service.findUnique({ where: { slug: 'legal-work' }, select: { id: true, name: true, route: true } });
    if (!svc) { console.log('legal-work not found'); return; }
    console.log('Before:', svc.route);
    const updated = await prisma.service.update({
        where: { id: svc.id },
        data: { route: '/dynamic/home-essentials/legal-work' },
    });
    console.log('After:', updated.route);
}

main()
    .catch((e) => { console.error(e); process.exitCode = 1; })
    .finally(() => prisma.$disconnect());
