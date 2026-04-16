const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
    const b = await prisma.booking.findFirst({
        where: { formDataJson: { not: null } },
        orderBy: { createdAt: 'desc' }
    });
    console.log(JSON.stringify(b, null, 2));
}

check().then(() => prisma.$disconnect());
