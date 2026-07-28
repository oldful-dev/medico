const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
    console.log('Seeding admin: backend@ayuxa.net...');
    const passwordHash = await bcrypt.hash('admin123', 12);

    const admin = await prisma.admin.upsert({
        where: { email: 'backend@ayuxa.net' },
        update: {
            name: 'Ayuxa Admin',
            passwordHash: passwordHash,
            role: 'SUPER_ADMIN',
            isActive: true
        },
        create: {
            name: 'Ayuxa Admin',
            email: 'backend@ayuxa.net',
            passwordHash: passwordHash,
            role: 'SUPER_ADMIN',
            isActive: true
        }
    });

    console.log('Test admin created/updated successfully:', admin.email);
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
