const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const res = await prisma.service.updateMany({
        where: { slug: 'nurse-care' },
        data: {
            isDynamic: false,
            category: 'CARE'
        }
    });
    console.log('✅ Updated Nurse Care service:', res);
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
