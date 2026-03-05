const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    await prisma.admin.update({
        where: { email: 'superadmin@medico.care' },
        data: { email: 'superadmin@oldful.com' }
    });
    console.log("Updated admin email");
}

main().finally(() => prisma.$disconnect());
