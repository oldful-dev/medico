const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
    console.log('🗑️ Deleting old plans...');

    // First delete subscriptions for old plans
    const oldPlans = await prisma.plan.findMany({
        where: {
            name: {
                notIn: ['Care Plan', 'HomeMaker Plan']
            }
        },
        select: { id: true }
    });

    if (oldPlans.length > 0) {
        const planIds = oldPlans.map(p => p.id);
        await prisma.subscription.deleteMany({
            where: {
                planId: {
                    in: planIds
                }
            }
        });
        console.log(`✅ Deleted subscriptions for old plans`);
    }

    // Then delete old plans
    const result = await prisma.plan.deleteMany({
        where: {
            name: {
                notIn: ['Care Plan', 'HomeMaker Plan']
            }
        }
    });

    console.log(`✅ Deleted ${result.count} old plans`);
}

main()
    .catch((e) => {
        console.error('Error:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
