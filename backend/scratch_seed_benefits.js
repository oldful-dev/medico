const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('🧹 Starting cleanup and benefit seeding with foreign key re-assignment...');

  // Canonical plans mapping
  // From Duplicate -> Correct
  const duplicateMap = {
    'Home Maker Plan': 'HomeMaker Plan',
    'Home Maker Plus': 'HomeMaker Plus'
  };

  for (const [dupName, correctName] of Object.entries(duplicateMap)) {
    const dupPlan = await prisma.plan.findFirst({ where: { name: dupName } });
    const correctPlan = await prisma.plan.findFirst({ where: { name: correctName } });

    if (dupPlan && correctPlan) {
      console.log(`Re-assigning records from duplicate "${dupName}" (${dupPlan.id}) to canonical "${correctName}" (${correctPlan.id})`);

      // Update Subscriptions
      const subUpdate = await prisma.subscription.updateMany({
        where: { planId: dupPlan.id },
        data: { planId: correctPlan.id }
      });
      console.log(`Updated ${subUpdate.count} subscriptions.`);

      // Update Scheduled Subscriptions
      const subSchedUpdate = await prisma.subscription.updateMany({
        where: { scheduledPlanId: dupPlan.id },
        data: { scheduledPlanId: correctPlan.id }
      });
      console.log(`Updated ${subSchedUpdate.count} scheduled subscriptions.`);

      // Update Upgrade History (OldPlan)
      const oldHistUpdate = await prisma.subscriptionUpgradeHistory.updateMany({
        where: { oldPlanId: dupPlan.id },
        data: { oldPlanId: correctPlan.id }
      });
      console.log(`Updated ${oldHistUpdate.count} upgrade history (oldPlanId) records.`);

      // Update Upgrade History (NewPlan)
      const newHistUpdate = await prisma.subscriptionUpgradeHistory.updateMany({
        where: { newPlanId: dupPlan.id },
        data: { newPlanId: correctPlan.id }
      });
      console.log(`Updated ${newHistUpdate.count} upgrade history (newPlanId) records.`);

      // Delete duplicate plan
      await prisma.plan.delete({ where: { id: dupPlan.id } });
      console.log(`Deleted duplicate plan "${dupName}".`);
    }
  }

  // 2. Fetch valid plans
  const plans = await prisma.plan.findMany();
  console.log(`Found ${plans.length} valid plans in database.`);

  // Clear existing plan benefits to start fresh and avoid duplicates
  await prisma.planBenefit.deleteMany({});
  console.log('Cleared existing plan benefits.');

  // 3. Define benefits config
  const benefitsConfig = {
    'Care Plan': [
      { benefitCode: 'SOS', title: '24/7 SOS Emergency Support', description: 'Immediate emergency alert triggers', usageLimit: 0, usagePeriod: 'MONTH', displayOrder: 1 },
      { benefitCode: 'TELECONSULT', title: 'Tele Consultation', description: 'Consult with top physicians online', usageLimit: 4, usagePeriod: 'MONTH', displayOrder: 2 },
      { benefitCode: 'MEDICINE', title: 'Medicine Delivery', description: 'Free home delivery of prescriptions', usageLimit: 4, usagePeriod: 'MONTH', displayOrder: 3 }
    ],
    'Care Plus': [
      { benefitCode: 'SOS', title: '24/7 SOS Emergency Support', description: 'Immediate emergency alert triggers', usageLimit: 0, usagePeriod: 'MONTH', displayOrder: 1 },
      { benefitCode: 'TELECONSULT', title: 'Tele Consultation', description: 'Consult with top physicians online', usageLimit: 6, usagePeriod: 'MONTH', displayOrder: 2 },
      { benefitCode: 'MEDICINE', title: 'Medicine Delivery', description: 'Free home delivery of prescriptions', usageLimit: 6, usagePeriod: 'MONTH', displayOrder: 3 },
      { benefitCode: 'BLOOD_TEST', title: 'Blood Test Profile', description: 'Comprehensive diagnostic blood panel', usageLimit: 1, usagePeriod: 'QUARTER', displayOrder: 4 }
    ],
    'Premium Care': [
      { benefitCode: 'SOS', title: '24/7 SOS Emergency Support', description: 'Immediate emergency alert triggers', usageLimit: 0, usagePeriod: 'MONTH', displayOrder: 1 },
      { benefitCode: 'TELECONSULT', title: 'Unlimited Teleconsultation', description: 'Unlimited access to verified doctors', usageLimit: 0, usagePeriod: 'MONTH', displayOrder: 2 },
      { benefitCode: 'MEDICINE', title: 'Medicine Delivery', description: 'Free home delivery of prescriptions', usageLimit: 12, usagePeriod: 'MONTH', displayOrder: 3 },
      { benefitCode: 'BLOOD_TEST', title: 'Blood Test Profile', description: 'Comprehensive diagnostic blood panel', usageLimit: 2, usagePeriod: 'QUARTER', displayOrder: 4 },
      { benefitCode: 'CARE_MANAGER', title: 'Dedicated Care Manager', description: 'Assigned specialist to handle your requests', usageLimit: 0, usagePeriod: 'MONTH', displayOrder: 5 }
    ],
    'HomeMaker Plan': [
      { benefitCode: 'SOS', title: '24/7 SOS Emergency Support', description: 'Immediate emergency alert triggers', usageLimit: 0, usagePeriod: 'MONTH', displayOrder: 1 },
      { benefitCode: 'ZERO_SERVICE_FEE', title: 'Zero Service Fee on Bookings', description: 'Booking & platform fees waived', usageLimit: 4, usagePeriod: 'MONTH', displayOrder: 2 },
      { benefitCode: 'GROCERY_ASSIST', title: 'Grocery Delivery Support', description: 'Assistance shopping and delivery at home', usageLimit: 2, usagePeriod: 'MONTH', displayOrder: 3 },
      { benefitCode: 'BILL_PAYMENT', title: 'Bill Payments', description: 'Hands-off management of utilities bills', usageLimit: 2, usagePeriod: 'MONTH', displayOrder: 4 }
    ],
    'HomeMaker Plus': [
      { benefitCode: 'SOS', title: '24/7 SOS Emergency Support', description: 'Immediate emergency alert triggers', usageLimit: 0, usagePeriod: 'MONTH', displayOrder: 1 },
      { benefitCode: 'ZERO_SERVICE_FEE', title: 'Zero Service Fee on Bookings', description: 'Booking & platform fees waived', usageLimit: 6, usagePeriod: 'MONTH', displayOrder: 2 },
      { benefitCode: 'GROCERY_ASSIST', title: 'Grocery Delivery Support', description: 'Assistance shopping and delivery at home', usageLimit: 4, usagePeriod: 'MONTH', displayOrder: 3 },
      { benefitCode: 'BILL_PAYMENT', title: 'Bill Payments', description: 'Hands-off management of utilities bills', usageLimit: 4, usagePeriod: 'MONTH', displayOrder: 4 },
      { benefitCode: 'TECH_SUPPORT', title: 'Tech Support', description: 'Smart device and home tech configuration', usageLimit: 2, usagePeriod: 'MONTH', displayOrder: 5 }
    ],
    'Premium HomeMaker': [
      { benefitCode: 'SOS', title: '24/7 SOS Emergency Support', description: 'Immediate emergency alert triggers', usageLimit: 0, usagePeriod: 'MONTH', displayOrder: 1 },
      { benefitCode: 'ZERO_SERVICE_FEE', title: 'Unlimited Free Service Fee Bookings', description: 'All booking and platform fees waived', usageLimit: 0, usagePeriod: 'MONTH', displayOrder: 2 },
      { benefitCode: 'GROCERY_ASSIST', title: 'Unlimited Grocery Delivery Support', description: 'Unlimited grocery runs and deliveries', usageLimit: 0, usagePeriod: 'MONTH', displayOrder: 3 },
      { benefitCode: 'BILL_PAYMENT', title: 'Unlimited Bill Payments', description: 'Unlimited hands-off utility management', usageLimit: 0, usagePeriod: 'MONTH', displayOrder: 4 },
      { benefitCode: 'TECH_SUPPORT', title: 'Unlimited Tech Support', description: 'Unlimited home technology setup and config', usageLimit: 0, usagePeriod: 'MONTH', displayOrder: 5 },
      { benefitCode: 'HOME_AUDIT', title: 'Home Safety Audit', description: 'Full professional home elderly safety inspection', usageLimit: 1, usagePeriod: 'YEAR', displayOrder: 6 }
    ]
  };

  for (const plan of plans) {
    const config = benefitsConfig[plan.name];
    if (!config) {
      console.log(`No benefits configured for plan: ${plan.name}`);
      continue;
    }

    console.log(`Seeding ${config.length} benefits for plan: ${plan.name}`);
    for (const item of config) {
      await prisma.planBenefit.create({
        data: {
          planId: plan.id,
          benefitCode: item.benefitCode,
          title: item.title,
          description: item.description,
          usageLimit: item.usageLimit,
          usagePeriod: item.usagePeriod,
          displayOrder: item.displayOrder,
          serviceCategory: item.benefitCode,
          freeCount: item.usageLimit
        }
      });
    }
  }

  console.log('🎉 Seeding and database clean complete!');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
