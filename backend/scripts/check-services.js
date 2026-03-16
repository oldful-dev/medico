const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    console.log('--- FETCHING SERVICES ---');
    const services = await prisma.service.findMany({
        select: { id: true, name: true, slug: true, isEnabled: true }
    });
    console.log(`Total Services: ${services.length}`);
    services.forEach(s => {
        console.log(`- [${s.isEnabled ? 'ACTIVE' : 'DISABLED'}] ${s.name} (${s.slug}) -> ${s.id}`);
    });

    console.log('\n--- FETCHING CITIES ---');
    const cities = await prisma.city.findMany({
        select: { id: true, name: true, isEnabled: true }
    });
    cities.forEach(c => {
        console.log(`- [${c.isEnabled ? 'ACTIVE' : 'DISABLED'}] ${c.name} -> ${c.id}`);
    });
}

main()
    .catch(e => console.error(e))
    .finally(() => prisma.$disconnect());
