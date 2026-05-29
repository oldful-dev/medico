const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const userId = '78c0775e-55ec-477f-a3a0-8ec1782ab285';
  const activeSubs = await prisma.subscription.findMany({
      where: {
          userId,
          status: 'ACTIVE',
          expiryDate: { gte: new Date() },
      },
      include: {
          plan: { select: { name: true, planType: true } },
      },
  });

  console.log("Found active subscriptions: ", activeSubs.length);
  for (const s of activeSubs) {
    console.log(`Sub ID: ${s.id}, Plan: ${s.plan?.name} (${s.plan?.planType}), Status: ${s.status}, Expiry: ${s.expiryDate}`);
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
