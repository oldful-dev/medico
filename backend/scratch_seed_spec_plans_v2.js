const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('🧹 Starting cleanup and seeding of spec-based plans and benefits...');

  // 1. Find or create the 3 canonical plans with correct metadata, sortOrder, tierLevel, and type
  const planData = [
    {
      name: 'Ayuxa Lifeline',
      description: 'Digital & Remote Care',
      planType: 'CARE',
      quarterlyPrice: 599,
      biannualPrice: 999,
      yearlyPrice: 1999,
      tierLevel: 1,
      sortOrder: 1,
    },
    {
      name: 'Ayuxa Companion',
      description: 'In-Person Care',
      planType: 'CARE',
      quarterlyPrice: 899,
      biannualPrice: 1499,
      yearlyPrice: 2999,
      tierLevel: 2,
      sortOrder: 2,
    },
    {
      name: 'Ayuxa Home Essentials',
      description: 'Home Essential Plan',
      planType: 'HOMEMAKER',
      quarterlyPrice: 1499,
      biannualPrice: 2499,
      yearlyPrice: 4799,
      tierLevel: 1,
      sortOrder: 3,
    }
  ];

  const planMap = {};

  for (const p of planData) {
    let plan = await prisma.plan.findFirst({ where: { name: p.name } });
    if (!plan) {
      plan = await prisma.plan.create({
        data: {
          name: p.name,
          description: p.description,
          planType: p.planType,
          quarterlyPrice: p.quarterlyPrice,
          biannualPrice: p.biannualPrice,
          yearlyPrice: p.yearlyPrice,
          tierLevel: p.tierLevel,
          sortOrder: p.sortOrder,
          isVisible: true,
        }
      });
      console.log(`Created new plan: ${p.name} (${plan.id})`);
    } else {
      plan = await prisma.plan.update({
        where: { id: plan.id },
        data: {
          description: p.description,
          planType: p.planType,
          quarterlyPrice: p.quarterlyPrice,
          biannualPrice: p.biannualPrice,
          yearlyPrice: p.yearlyPrice,
          tierLevel: p.tierLevel,
          sortOrder: p.sortOrder,
        }
      });
      console.log(`Updated existing plan: ${p.name} (${plan.id})`);
    }
    planMap[p.name] = plan;
  }

  // Delete other plans that are not canonical (just in case)
  const allDbPlans = await prisma.plan.findMany();
  for (const dbPlan of allDbPlans) {
    if (!planMap[dbPlan.name]) {
      console.log(`Warning: Found non-canonical plan "${dbPlan.name}" (${dbPlan.id}) in database.`);
    }
  }

  // Clear existing plan benefits for canonical plans to avoid duplicates
  const canonicalIds = Object.values(planMap).map(p => p.id);
  const deletedBenefits = await prisma.planBenefit.deleteMany({
    where: { planId: { in: canonicalIds } }
  });
  console.log(`Cleared ${deletedBenefits.count} existing plan benefits for canonical plans.`);

  // 2. Define features/benefits config matching the spec EXACTLY
  const specBenefits = {
    'Ayuxa Lifeline': [
      { benefitCode: 'FAMILY_PORTAL', title: 'Family Portal', description: 'Full access to the Ayuxa Patient & Family portal.', usageLimit: 0, usagePeriod: 'MONTH', displayOrder: 1 },
      { benefitCode: 'SOS', title: '24/7 SOS', description: 'Instant emergency response & ambulance coordination (2/mo).', usageLimit: 2, usagePeriod: 'MONTH', displayOrder: 2 },
      { benefitCode: 'TELECONSULT', title: 'Consultations', description: 'Free tele-consultation with a network doctor (1/mo).', usageLimit: 1, usagePeriod: 'MONTH', displayOrder: 3 },
      { benefitCode: 'COMPANIONSHIP_CALL', title: 'Companionship', description: 'Check-in call from the Ayuxa care team (2/mo).', usageLimit: 2, usagePeriod: 'MONTH', displayOrder: 4 },
      { benefitCode: 'MEDICINE_DELIVERY', title: 'Pharmacy', description: 'Free Medicine Delivery with 10% Discount (1/mo).', usageLimit: 1, usagePeriod: 'MONTH', displayOrder: 5 },
      { benefitCode: 'BLOOD_TEST', title: 'Diagnostics', description: 'Free comprehensive blood test profile (1/qu).', usageLimit: 1, usagePeriod: 'QUARTER', displayOrder: 6 },
      { benefitCode: 'PHONE_SUPPORT', title: 'Support', description: 'Standard phone support (2/mo).', usageLimit: 2, usagePeriod: 'MONTH', displayOrder: 7 },
    ],
    'Ayuxa Companion': [
      { benefitCode: 'BASE_PLAN', title: 'Base Plan', description: 'Includes everything in Ayuxa Lifeline.', usageLimit: 0, usagePeriod: 'MONTH', displayOrder: 1 },
      { benefitCode: 'CARE_MANAGER', title: 'Priority Support', description: 'A dedicated Care Manager.', usageLimit: 0, usagePeriod: 'MONTH', displayOrder: 2 },
      { benefitCode: 'CAREGIVER_VISIT', title: 'Physical Caregiving', description: 'Care visits for companionship & health checks (2/mo).', usageLimit: 2, usagePeriod: 'MONTH', displayOrder: 3 },
      { benefitCode: 'NURSE_VISIT', title: 'Nursing Care', description: 'Home nurse visit for emergency or nursing needs (1/mo).', usageLimit: 1, usagePeriod: 'MONTH', displayOrder: 4 },
      { benefitCode: 'SPIRITUAL_ESCORT', title: 'Spiritual Escort', description: 'Accompanied visits to places of worship within the state (1/mo).', usageLimit: 1, usagePeriod: 'MONTH', displayOrder: 5 },
      { benefitCode: 'LOCAL_MEETUP', title: 'Local Meet-Ups', description: 'Free local meetup to socialize (1/mo).', usageLimit: 1, usagePeriod: 'MONTH', displayOrder: 6 },
      { benefitCode: 'HOSPITAL_ACCOMPANIMENT', title: 'Hospital Accompaniment', description: 'Doctor visit with pickup/drop, paperwork support, and family updates.', usageLimit: 0, usagePeriod: 'MONTH', displayOrder: 7 },
      { benefitCode: 'PICKUP_DROP', title: 'Pickup & Drop', description: 'Free transport for scans, ECGs, or clinic tests (1/mo on-demand).', usageLimit: 1, usagePeriod: 'MONTH', displayOrder: 8 },
    ],
    'Ayuxa Home Essentials': [
      { benefitCode: 'HANDYMEN', title: 'Handymen on Demand', description: 'Verified professionals at your doorstep.', usageLimit: 0, usagePeriod: 'MONTH', displayOrder: 1 },
      { benefitCode: 'ZERO_SERVICE_FEE', title: 'Zero Service Fee', description: 'Waived Ayuxa fees for AC, plumbing, appliance repair, etc.', usageLimit: 0, usagePeriod: 'MONTH', displayOrder: 2 },
      { benefitCode: 'BILL_PAYMENT', title: 'Bill Payments', description: 'Offline/Online utility bill payments (3/mo).', usageLimit: 3, usagePeriod: 'MONTH', displayOrder: 3 },
      { benefitCode: 'TECH_SUPPORT', title: 'Tech Support', description: 'Media, UPI, and device troubleshooting (2/mo).', usageLimit: 2, usagePeriod: 'MONTH', displayOrder: 4 },
      { benefitCode: 'GROCERY_ASSIST', title: 'Assistance', description: 'Heavy grocery delivery & errand runs (1/mo).', usageLimit: 1, usagePeriod: 'MONTH', displayOrder: 5 },
      { benefitCode: 'PAPERWORK_ASSIST', title: 'Paperwork', description: 'Bank, legal, or documentation physical assistance (1/mo).', usageLimit: 1, usagePeriod: 'MONTH', displayOrder: 6 },
      { benefitCode: 'DEEP_CLEANING', title: 'Deep Cleaning', description: 'Supervised deep cleaning & pest control coordination.', usageLimit: 0, usagePeriod: 'MONTH', displayOrder: 7 },
      { benefitCode: 'SANITATION', title: 'Sanitation', description: 'Full washroom sanitation (1/qu).', usageLimit: 1, usagePeriod: 'QUARTER', displayOrder: 8 },
      { benefitCode: 'HOME_AUDIT', title: 'Home Audit', description: 'Quarterly fall-prevention & safety audit (1/qu).', usageLimit: 1, usagePeriod: 'QUARTER', displayOrder: 9 },
      { benefitCode: 'CUSTOM_REQUEST', title: 'Custom Request', description: 'On-demand request for services not listed in the app (1/mo).', usageLimit: 1, usagePeriod: 'MONTH', displayOrder: 10 },
    ]
  };

  for (const [planName, benefits] of Object.entries(specBenefits)) {
    const plan = planMap[planName];
    console.log(`Seeding ${benefits.length} benefits for ${planName}...`);
    for (const b of benefits) {
      await prisma.planBenefit.create({
        data: {
          planId: plan.id,
          benefitCode: b.benefitCode,
          title: b.title,
          description: b.description,
          usageLimit: b.usageLimit,
          usagePeriod: b.usagePeriod,
          displayOrder: b.displayOrder,
          serviceCategory: b.benefitCode,
          freeCount: b.usageLimit,
        }
      });
    }
  }

  console.log('🎉 Spec plans and benefits seeding completed successfully!');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
