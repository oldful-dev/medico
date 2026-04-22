const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
    try {
        const config = await prisma.uIConfig.findUnique({
            where: { key: 'sdui_staff_metadata' }
        });
        
        console.log('=== UIConfig Entry (sdui_staff_metadata) ===');
        if (config) {
            console.log(JSON.stringify(config.configJson, null, 2));
        } else {
            console.log('Not found - needs to be created first');
        }
        
        const specs = await prisma.caregiver.findMany({
            select: { specialization: true },
            distinct: ['specialization']
        });
        
        console.log('\n=== Caregiver Specializations in Database ===');
        console.log(specs.map(s => s.specialization));
        
        const roles = await prisma.admin.findMany({
            select: { role: true },
            distinct: ['role']
        });
        
        console.log('\n=== Admin Roles in Database ===');
        console.log(roles.map(r => r.role));
        
    } catch (err) {
        console.error('Error:', err.message);
    } finally {
        await prisma.$disconnect();
    }
}

check();
