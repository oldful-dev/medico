const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
    console.log('Seeding test admin: adarsharya2911@gmail.com...');
    const passwordHash = await bcrypt.hash('12345', 12);

    const admin = await prisma.admin.upsert({
        where: { email: 'adarsharya2911@gmail.com' },
        update: {
            name: 'Adarsh Arya',
            passwordHash: passwordHash,
            role: 'SUPER_ADMIN',
            isActive: true
        },
        create: {
            name: 'Adarsh Arya',
            email: 'adarsharya2911@gmail.com',
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
