const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
    const plans = await prisma.plan.findMany({
        include: { planBenefits: true }
    });
    for (const plan of plans) {
        console.log(`=== PLAN: ${plan.name} (${plan.planType}) ===`);
        console.log(`Prices: Quarterly: ${plan.quarterlyPrice}, Biannual: ${plan.biannualPrice}, Yearly: ${plan.yearlyPrice}`);
        for (const b of plan.planBenefits) {
            console.log(`  - Code: ${b.benefitCode}`);
            console.log(`    Title: ${b.title}`);
            console.log(`    Limit: ${b.usageLimit} / ${b.usagePeriod}`);
            console.log(`    DisplayOrder: ${b.displayOrder}`);
        }
    }
}
main().catch(console.error).finally(() => prisma.$disconnect());
