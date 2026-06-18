const prisma = require('../config/database');
const { logger } = require('../config/logger');

/**
 * Helper to calculate period start anniversary date
 */
function getPeriodStart(startDate, usagePeriod, now = new Date()) {
  const start = new Date(startDate);
  const current = new Date(now);

  if (current < start) return start;

  if (usagePeriod === 'MONTH') {
    let diffMonths = (current.getFullYear() - start.getFullYear()) * 12 + (current.getMonth() - start.getMonth());
    if (current.getDate() < start.getDate()) {
      diffMonths--;
    }
    const periodStart = new Date(start);
    periodStart.setMonth(start.getMonth() + diffMonths);
    return periodStart;
  } else if (usagePeriod === 'QUARTER') {
    let diffMonths = (current.getFullYear() - start.getFullYear()) * 12 + (current.getMonth() - start.getMonth());
    if (current.getDate() < start.getDate()) {
      diffMonths--;
    }
    let diffQuarters = Math.floor(diffMonths / 3);
    const periodStart = new Date(start);
    periodStart.setMonth(start.getMonth() + diffQuarters * 3);
    return periodStart;
  } else if (usagePeriod === 'YEAR') {
    let diffYears = current.getFullYear() - start.getFullYear();
    const anniversaryThisYear = new Date(start);
    anniversaryThisYear.setFullYear(current.getFullYear());
    if (current < anniversaryThisYear) {
      diffYears--;
    }
    const periodStart = new Date(start);
    periodStart.setFullYear(start.getFullYear() + diffYears);
    return periodStart;
  }
  return start;
}

/**
 * Returns the benefits for a subscription, applying Companion inheritance if active.
 */
async function getSubscriptionBenefitsWithInheritance(subscription, tx = prisma) {
  if (!subscription || !subscription.plan) return [];
  
  let benefits = [...(subscription.plan.planBenefits || [])];

  const planNameNormalized = (subscription.plan.name || '').toLowerCase();
  const planType = subscription.plan.planType;
  const tierLevel = subscription.plan.tierLevel;

  // Companion plan inherits all Lifeline plan benefits
  if (planNameNormalized.includes('companion') || (planType === 'CARE' && tierLevel === 2)) {
    try {
      const lifelinePlan = await tx.plan.findFirst({
        where: { name: 'Ayuxa Lifeline' },
        include: { planBenefits: true }
      });
      if (lifelinePlan && lifelinePlan.planBenefits) {
        // Merge benefits avoiding duplicates
        const existingCodes = new Set(benefits.map(b => b.benefitCode));
        for (const lifelineBenefit of lifelinePlan.planBenefits) {
          if (!existingCodes.has(lifelineBenefit.benefitCode)) {
            benefits.push(lifelineBenefit);
          }
        }
      }
    } catch (err) {
      logger.error('Failed to inherit Lifeline benefits in Companion subscription:', err.message);
    }
  }

  return benefits;
}

/**
 * Checks if a user is allowed to consume a subscription benefit
 */
async function canConsumeBenefit(userId, benefitCode) {
  if (!userId || !benefitCode) {
    return { allowed: false, remaining: 0, reason: 'INVALID_PARAMETERS' };
  }

  const activeSubscriptions = await prisma.subscription.findMany({
    where: {
      userId,
      status: 'ACTIVE',
      expiryDate: { gt: new Date() }
    },
    include: {
      plan: {
        include: {
          planBenefits: true
        }
      },
      usage: true
    }
  });

  if (activeSubscriptions.length === 0) {
    return { allowed: false, remaining: 0, reason: 'NO_ACTIVE_SUBSCRIPTION' };
  }

  // Iterate over all active subscriptions to see if any cover this benefit
  for (const sub of activeSubscriptions) {
    const benefits = await getSubscriptionBenefitsWithInheritance(sub);
    const matchingBenefit = benefits.find(b => b.benefitCode.toUpperCase() === benefitCode.toUpperCase());

    if (matchingBenefit) {
      // Find or create usage record
      let usage = sub.usage.find(u => u.serviceCategory.toUpperCase() === benefitCode.toUpperCase());
      if (!usage) {
        usage = await prisma.subscriptionUsage.create({
          data: {
            subscriptionId: sub.id,
            serviceCategory: matchingBenefit.benefitCode,
            totalAllocated: matchingBenefit.usageLimit,
            usedCount: 0,
            lockedCount: 0
          }
        });
      }

      // Check reset boundaries inline in real-time
      const periodStart = getPeriodStart(sub.startDate, matchingBenefit.usagePeriod);
      if (usage.updatedAt < periodStart) {
        // Reset the used count to 0 in database
        usage = await prisma.subscriptionUsage.update({
          where: { id: usage.id },
          data: { usedCount: 0, lockedCount: 0 }
        });

        // Audit logging for reset
        await prisma.auditLog.create({
          data: {
            action: 'BENEFIT_RESET',
            entity: 'SubscriptionUsage',
            entityId: usage.id,
            oldValue: { usedCount: usage.usedCount },
            newValue: { usedCount: 0 }
          }
        });
      }

      const limit = matchingBenefit.usageLimit;
      if (limit === 0) {
        // 0 = unlimited benefit
        return { allowed: true, remaining: 9999, subscriptionId: sub.id, usageId: usage.id };
      }

      const remaining = Math.max(0, limit - usage.usedCount);
      if (remaining > 0) {
        return { allowed: true, remaining, subscriptionId: sub.id, usageId: usage.id };
      } else {
        // Audit log denied
        await prisma.auditLog.create({
          data: {
            action: 'BENEFIT_DENIED',
            entity: 'SubscriptionUsage',
            entityId: usage.id,
            newValue: { userId, benefitCode, reason: 'LIMIT_EXCEEDED' }
          }
        });
        return { allowed: false, remaining: 0, reason: 'LIMIT_EXCEEDED', subscriptionId: sub.id, usageId: usage.id };
      }
    }
  }

  return { allowed: false, remaining: 0, reason: 'BENEFIT_NOT_IN_PLAN' };
}

/**
 * Consumes a benefit (increments usedCount)
 */
async function consumeBenefit(userId, benefitCode, bookingId = null) {
  const check = await canConsumeBenefit(userId, benefitCode);
  if (!check.allowed) {
    return { success: false, reason: check.reason };
  }

  // If benefit is unlimited, we don't increment the usage counter
  if (check.remaining === 9999) {
    // Still log audit log for tracking
    await prisma.auditLog.create({
      data: {
        action: 'BENEFIT_CONSUMED',
        entity: 'Subscription',
        entityId: check.subscriptionId,
        newValue: { userId, benefitCode, bookingId, unlimited: true }
      }
    });
    return { success: true, remaining: 9999 };
  }

  // Otherwise, increment the count
  const updatedUsage = await prisma.subscriptionUsage.update({
    where: { id: check.usageId },
    data: { usedCount: { increment: 1 } }
  });

  // Log in AuditLog
  await prisma.auditLog.create({
    data: {
      action: 'BENEFIT_CONSUMED',
      entity: 'SubscriptionUsage',
      entityId: check.usageId,
      newValue: { userId, benefitCode, bookingId, usedCount: updatedUsage.usedCount }
    }
  });

  return { success: true, remaining: Math.max(0, updatedUsage.totalAllocated - updatedUsage.usedCount) };
}

/**
 * Fetches remaining usage statistics for a user's active membership benefits
 */
async function getRemainingUsage(userId) {
  if (!userId) return [];

  const activeSubs = await prisma.subscription.findMany({
    where: {
      userId,
      status: 'ACTIVE',
      expiryDate: { gt: new Date() }
    },
    include: {
      plan: {
        include: {
          planBenefits: true
        }
      },
      usage: true
    }
  });

  const results = [];

  for (const sub of activeSubs) {
    const benefits = await getSubscriptionBenefitsWithInheritance(sub);
    for (const benefit of benefits) {
      let usage = sub.usage.find(u => u.serviceCategory.toUpperCase() === benefit.benefitCode.toUpperCase());
      if (!usage) {
        usage = await prisma.subscriptionUsage.create({
          data: {
            subscriptionId: sub.id,
            serviceCategory: benefit.benefitCode,
            totalAllocated: benefit.usageLimit,
            usedCount: 0,
            lockedCount: 0
          }
        });
      }

      // Check reset boundaries inline
      const periodStart = getPeriodStart(sub.startDate, benefit.usagePeriod);
      if (usage.updatedAt < periodStart) {
        usage = await prisma.subscriptionUsage.update({
          where: { id: usage.id },
          data: { usedCount: 0, lockedCount: 0 }
        });

        await prisma.auditLog.create({
          data: {
            action: 'BENEFIT_RESET',
            entity: 'SubscriptionUsage',
            entityId: usage.id,
            oldValue: { usedCount: usage.usedCount },
            newValue: { usedCount: 0 }
          }
        });
      }

      const allowed = benefit.usageLimit;
      const used = usage.usedCount;
      const remaining = allowed === 0 ? 9999 : Math.max(0, allowed - used);

      results.push({
        benefitCode: benefit.benefitCode,
        allowed,
        used,
        remaining,
        title: benefit.title,
        description: benefit.description,
        usagePeriod: benefit.usagePeriod
      });
    }
  }

  return results;
}

/**
 * Daily scheduled function to reset expired usage counters
 */
async function resetExpiredUsage() {
  const now = new Date();
  const activeSubs = await prisma.subscription.findMany({
    where: {
      status: 'ACTIVE',
      expiryDate: { gt: now }
    },
    include: {
      plan: {
        include: {
          planBenefits: true
        }
      },
      usage: true
    }
  });

  let resetCount = 0;

  for (const sub of activeSubs) {
    const benefits = await getSubscriptionBenefitsWithInheritance(sub);
    for (const benefit of benefits) {
      const usage = await prisma.subscriptionUsage.findFirst({
        where: {
          subscriptionId: sub.id,
          serviceCategory: benefit.benefitCode
        }
      });

      if (usage) {
        const periodStart = getPeriodStart(sub.startDate, benefit.usagePeriod, now);
        if (usage.updatedAt < periodStart) {
          await prisma.subscriptionUsage.update({
            where: { id: usage.id },
            data: { usedCount: 0, lockedCount: 0 }
          });

          await prisma.auditLog.create({
            data: {
              action: 'BENEFIT_RESET',
              entity: 'SubscriptionUsage',
              entityId: usage.id,
              newValue: { usedCount: 0 }
            }
          });
          resetCount++;
        }
      }
    }
  }

  logger.info(`[BenefitResetCron] Reset completed. ${resetCount} benefits reset.`);
  return resetCount;
}

module.exports = {
  canConsumeBenefit,
  consumeBenefit,
  getRemainingUsage,
  resetExpiredUsage,
  getPeriodStart,
  getSubscriptionBenefitsWithInheritance
};
