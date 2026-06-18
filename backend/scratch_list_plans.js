const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
    const plans = await prisma.plan.findMany({
        include: { planBenefits: true }
    });
    console.log(JSON.stringify(plans.map(p => ({
        id: p.id,
        name: p.name,
        planType: p.planType,
        benefits: p.planBenefits.map(b => b.benefitCode)
    })), null, 2));
}
main().catch(console.error).finally(() => prisma.$disconnect());
