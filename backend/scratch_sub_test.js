const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function testSubscriptionFlow() {
  try {
    console.log("Creating test plan...");
    const plan = await prisma.plan.create({
      data: {
        name: "TEST CARE PLAN " + Date.now(),
        planType: "CARE",
        planBenefits: {
          create: [
            { serviceCategory: "DOCTOR_VISIT", freeCount: 2 }
          ]
        }
      },
      include: { planBenefits: true }
    });
    console.log("Plan created:", plan.id);

    console.log("Finding a user...");
    const user = await prisma.user.findFirst();
    if (!user) {
        console.log("No user found.");
        return;
    }
    
    console.log("Creating subscription for user:", user.id);
    const sub = await prisma.subscription.create({
      data: {
        userId: user.id,
        planId: plan.id,
        startDate: new Date(),
        expiryDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
        status: "ACTIVE",
        usage: {
          create: plan.planBenefits.map(b => ({
            serviceCategory: b.serviceCategory,
            totalAllocated: b.freeCount
          }))
        }
      },
      include: { usage: true }
    });
    console.log("Subscription created:", sub.id);
    console.log("Usage tracking generated:", sub.usage);

    // Test the checkout logic logic block:
    const serviceCategory = "DOCTOR_VISIT";
    let finalAyuxaFee = 150;
    
    const usageRecord = sub.usage.find(u => u.serviceCategory === serviceCategory);
    if (usageRecord) {
        const availableCount = usageRecord.totalAllocated - usageRecord.usedCount - usageRecord.lockedCount;
        if (availableCount > 0) {
            console.log(`Benefit applies! Available: ${availableCount}. Waiving AYUXA fee of ${finalAyuxaFee}`);
            finalAyuxaFee = 0;
        } else {
             console.log("No benefits available.");
        }
    } else {
         console.log("No benefits for this service category.");
    }
    
    console.log("Final AYUXA Fee:", finalAyuxaFee);

  } catch (error) {
    console.error(error);
  } finally {
    await prisma.$disconnect();
  }
}

testSubscriptionFlow();
