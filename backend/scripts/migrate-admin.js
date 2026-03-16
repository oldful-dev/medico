const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const prisma = new PrismaClient();

async function main() {
    console.log('Updating Admin Email to superadmin@oldful.com...');

    // First try to find the old one
    const oldAdmin = await prisma.admin.findUnique({
        where: { email: 'superadmin@medico.care' }
    });

    if (oldAdmin) {
        await prisma.admin.update({
            where: { id: oldAdmin.id },
            data: { email: 'superadmin@oldful.com' }
        });
        console.log('✅ Successfully migrated superadmin@medico.care to superadmin@oldful.com');
    } else {
        // Just create it if it doesn't exist
        const passwordHash = await bcrypt.hash('admin123', 12);
        await prisma.admin.upsert({
            where: { email: 'superadmin@oldful.com' },
            update: { passwordHash, isActive: true },
            create: {
                name: 'Super Admin',
                email: 'superadmin@oldful.com',
                passwordHash,
                role: 'SUPER_ADMIN',
                isActive: true
            }
        });
        console.log('✅ superadmin@oldful.com is now ready in the database.');
    }
}

main()
    .catch(e => console.error(e))
    .finally(() => prisma.$disconnect());
