const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const prisma = new PrismaClient();

async function main() {
    console.log('Seeding superadmin@ayuxa.com...');

    const passwordHash = await bcrypt.hash('admin123', 12);

    // Upsert new admin, also migrate any old emails
    const oldEmails = ['superadmin@medico.care', 'superadmin@ayuxa.com'];

    for (const oldEmail of oldEmails) {
        const existing = await prisma.admin.findUnique({ where: { email: oldEmail } });
        if (existing) {
            await prisma.admin.update({
                where: { id: existing.id },
                data: { email: 'superadmin@ayuxa.com', passwordHash, isActive: true }
            });
            console.log(`✅ Migrated ${oldEmail} → superadmin@ayuxa.com`);
            return;
        }
    }

    // No old admin found — upsert fresh
    await prisma.admin.upsert({
        where: { email: 'superadmin@ayuxa.com' },
        update: { passwordHash, isActive: true },
        create: {
            name: 'Super Admin',
            email: 'superadmin@ayuxa.com',
            passwordHash,
            role: 'SUPER_ADMIN',
            isActive: true
        }
    });

    console.log('✅ superadmin@ayuxa.com is ready with password: admin123');
}

main()
    .catch(e => console.error(e))
    .finally(() => prisma.$disconnect());
