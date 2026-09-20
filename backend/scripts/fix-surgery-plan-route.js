// Missed by rename-home-essentials-route-prefix.js, which only targeted
// /home-essentials-dynamic/ — this service was still on the old
// /dynamic-service/ path after that folder was renamed to
// app/dynamic/service/[slug].tsx, so it was broken until now.
// Run: node scripts/fix-surgery-plan-route.js
const prisma = require('../src/config/database');

async function main() {
    const services = await prisma.service.findMany({
        where: { route: { startsWith: '/dynamic-service/' } },
        select: { id: true, slug: true, name: true, route: true },
    });
    for (const svc of services) {
        const newRoute = svc.route.replace('/dynamic-service/', '/dynamic/service/');
        await prisma.service.update({ where: { id: svc.id }, data: { route: newRoute } });
        console.log(`${svc.name} (${svc.slug}): ${svc.route} -> ${newRoute}`);
    }
    console.log(`${services.length} service(s) updated.`);
}

main()
    .catch((e) => { console.error(e); process.exitCode = 1; })
    .finally(() => prisma.$disconnect());
