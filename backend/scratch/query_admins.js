const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
    const admins = await prisma.admin.findMany();
    console.log(JSON.stringify(admins, null, 2));
}
main().finally(() => prisma.$disconnect());
