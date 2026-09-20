// Renames every Home Essentials service's route prefix from
// /home-essentials-dynamic/<slug> to /dynamic/home-essentials/<slug>,
// matching the mobile app's folder rename (app/home-essentials-dynamic/
// -> app/dynamic/home-essentials/). Purely a URL-path change — the
// screen and its DB-driven rendering are unaffected.
//
// Run: node scripts/rename-home-essentials-route-prefix.js
const prisma = require('../src/config/database');

async function main() {
    const services = await prisma.service.findMany({
        where: { route: { startsWith: '/home-essentials-dynamic/' } },
        select: { id: true, slug: true, name: true, route: true },
    });

    for (const svc of services) {
        const newRoute = svc.route.replace('/home-essentials-dynamic/', '/dynamic/home-essentials/');
        await prisma.service.update({ where: { id: svc.id }, data: { route: newRoute } });
        console.log(`${svc.name} (${svc.slug}): ${svc.route} -> ${newRoute}`);
    }

    console.log(`\n${services.length} service(s) updated.`);
}

main()
    .catch((e) => { console.error(e); process.exitCode = 1; })
    .finally(() => prisma.$disconnect());
