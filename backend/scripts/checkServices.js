const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const services = await prisma.service.findMany({
        where: { serviceType: 'HOME_ESSENTIALS' }
    });
    console.log('Home Essentials Services Count:', services.length);
    console.log('Services Slugs:', services.map(s => s.slug));
}

main().catch(console.error).finally(() => prisma.$disconnect());
