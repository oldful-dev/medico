const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    try {
        const services = await prisma.service.findMany({
            select: { name: true, slug: true, route: true }
        });
        console.table(services);
    } catch (err) {
        console.error(err);
    } finally {
        await prisma.$disconnect();
    }
}

main();
