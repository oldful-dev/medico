const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const admin = await prisma.admin.findMany({ select: { email: true, role: true } });
    console.log(admin);
}
main().finally(() => prisma.$disconnect());
