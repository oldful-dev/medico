const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    console.log('🔄 Initializing existing services categories and isDynamic values...');
    
    // 1. Mark all existing services as isDynamic: false
    const updateCount = await prisma.service.updateMany({
        data: {
            isDynamic: false
        }
    });
    console.log(`✅ Set isDynamic: false for ${updateCount.count} services.`);

    // 2. Set category: 'HOME_ESSENTIALS' for serviceType: 'HOME_ESSENTIALS'
    const essentialsCount = await prisma.service.updateMany({
        where: {
            serviceType: 'HOME_ESSENTIALS'
        },
        data: {
            category: 'HOME_ESSENTIALS'
        }
    });
    console.log(`✅ Set category: 'HOME_ESSENTIALS' for ${essentialsCount.count} services.`);

    // 3. Set category: 'DIAGNOSTICS_FITNESS' for other services
    const diagnosticsCount = await prisma.service.updateMany({
        where: {
            NOT: {
                serviceType: 'HOME_ESSENTIALS'
            }
        },
        data: {
            category: 'DIAGNOSTICS_FITNESS'
        }
    });
    console.log(`✅ Set category: 'DIAGNOSTICS_FITNESS' for ${diagnosticsCount.count} services.`);

    console.log('🎉 Population complete!');
}

main()
    .catch((e) => {
        console.error('❌ Population failed:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
