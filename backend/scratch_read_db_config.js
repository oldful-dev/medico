const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function run() {
    try {
        const stored = await prisma.uIConfig.findUnique({
            where: { key: 'home_config' }
        });
        if (stored) {
            console.log('--- DB Config key: home_config ---');
            console.log(JSON.stringify(stored.configJson, null, 2));
        } else {
            console.log('No custom home_config found.');
        }
    } catch (err) {
        console.error('Error running script:', err);
    } finally {
        await prisma.$disconnect();
    }
}

run();
