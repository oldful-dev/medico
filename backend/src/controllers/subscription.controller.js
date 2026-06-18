// ──────────────────────────────────────────────
//  Subscription Management Controller
// ──────────────────────────────────────────────

const prisma = require('../config/database');
const { sendResponse, sendPaginatedResponse, paginate, calculateExpiryDate } = require('../utils/helpers');
const { logger } = require('../config/logger');

// GET /api/subscriptions
const getSubscriptions = async (req, res, next) => {
    try {
        const { page, limit, skip } = paginate(req.query);
        const { status, planId, userId, search } = req.query;

        const where = {};
        if (req.cityFilter) {
            where.user = { cityId: req.cityFilter };
        }
        if (status) where.status = status;
        if (planId) where.planId = planId;
        if (userId) where.userId = userId;
        if (search) {
            where.user = { name: { contains: search, mode: 'insensitive' } };
        }

        const [subscriptions, total] = await Promise.all([
            prisma.subscription.findMany({
                where,
                skip,
                take: limit,
                include: {
                    user: { select: { id: true, name: true, uniqueUserId: true, phone: true } },
                    plan: true,
                },
                orderBy: { createdAt: 'desc' },
            }),
            prisma.subscription.count({ where }),
        ]);

        sendPaginatedResponse(res, subscriptions, total, page, limit);
    } catch (error) {
        next(error);
    }
};

// POST /api/subscriptions
const createSubscription = async (req, res, next) => {
    try {
        const { userId, planId, billingCycle, startDate, amount, autoRenew, status } = req.body;
        const start = new Date(startDate || Date.now());
        const expiryDate = calculateExpiryDate(start, billingCycle);

        const subscription = await prisma.subscription.create({
            data: {
                userId,
                planId,
                billingCycle,
                startDate: start,
                expiryDate,
                amount,
                autoRenew: autoRenew || false,
                status: status || 'ACTIVE',
            },
            include: { plan: true, user: { select: { id: true, name: true, phone: true, smsEnabled: true } } },
        });

        // WhatsApp PAYMENT_RECEIVED + DLT SMS PAYMENT_RECEIVED — non-fatal
        if (subscription.user?.phone && (status || 'ACTIVE') === 'ACTIVE') {
            const { sendPaymentReceived } = require('../services/whatsapp');
            const { sendSMS } = require('../services/sms');
            sendPaymentReceived({
                phone: subscription.user.phone,
                name: subscription.user.name,
                amount: parseFloat(subscription.amount).toFixed(2),
                userId: subscription.userId,
            }).catch(() => {});
            if (subscription.user.smsEnabled !== false) {
                sendSMS({
                    template: 'PAYMENT_RECEIVED',
                    mobile: subscription.user.phone,
                    variables: [subscription.user.name, parseFloat(subscription.amount).toFixed(2)],
                    userId: subscription.userId,
                }).catch(() => {});
            }
        }

        sendResponse(res, 201, subscription, 'Subscription activated');
    } catch (error) {
        next(error);
    }
};

// POST /api/subscriptions/initiate (User authenticated)
const initiateUserSubscription = async (req, res, next) => {
    try {
        const { planId, billingCycle, amount } = req.body;
        const userId = req.user.id;
        
        const requestedPlan = await prisma.plan.findUnique({ where: { id: planId } });
        if (!requestedPlan) return res.status(404).json({ success: false, message: 'Plan not found.' });

        // ─── Slot Limit Enforcement ─────────────────────────────────────────
        // Read maxConcurrent from the Plan row (admin-configurable via PlansPage).
        // Falls back to planType defaults if the DB value is still the schema default of 1.
        const MAX_SLOTS = requestedPlan.maxConcurrent > 1
            ? requestedPlan.maxConcurrent
            : (requestedPlan.planType === 'CARE' ? 4 : 2);
        const activeCount = await prisma.subscription.count({
            where: {
                userId,
                status: 'ACTIVE',
                expiryDate: { gte: new Date() },
                plan: { planType: requestedPlan.planType },
            },
        });

        // Allow upgrade path (they already hold a slot)
        const existingSameType = await prisma.subscription.findFirst({
            where: {
                userId,
                status: 'ACTIVE',
                plan: { planType: requestedPlan.planType },
            },
            include: { plan: true },
        });
        const isUpgradeOrRenew = existingSameType && (
            existingSameType.planId === planId ||
            requestedPlan.tierLevel > existingSameType.plan.tierLevel
        );

        if (!isUpgradeOrRenew && activeCount >= MAX_SLOTS) {
            return res.status(400).json({
                success: false,
                message: `You can have at most ${MAX_SLOTS} active ${requestedPlan.planType === 'CARE' ? 'Care' : 'Home Essential'} plan${MAX_SLOTS > 1 ? 's' : ''} at a time.`,
            });
        }
        // ────────────────────────────────────────────────────────────────────

        const existingSub = existingSameType;


        // If active subscription exists in the same category
        if (existingSub) {
            if (requestedPlan.id === existingSub.planId) {
                // ─── Case 1: Same Plan -> Renewal / Extension ───
                const start = new Date(existingSub.expiryDate);
                const expiryDate = calculateExpiryDate(start, billingCycle);

                const subscription = await prisma.subscription.create({
                    data: {
                        userId,
                        planId,
                        billingCycle,
                        startDate: start,
                        expiryDate,
                        amount,
                        status: 'PAYMENT_PENDING',
                        upgradeFromSubId: existingSub.id,
                    },
                });
                return sendResponse(res, 201, subscription, 'Subscription renewal initiated');
            } else if (requestedPlan.tierLevel > existingSub.plan.tierLevel) {
                // ─── Case 2: Higher Tier -> Upgrade ───
                const now = Date.now();
                const start = existingSub.startDate.getTime();
                const expiry = existingSub.expiryDate.getTime();
                const daysTotal = Math.max(1, Math.round((expiry - start) / (1000 * 60 * 60 * 24)));
                const daysRemaining = Math.max(0, Math.round((expiry - now) / (1000 * 60 * 60 * 24)));
                const dailyRate = existingSub.amount / daysTotal;
                const creditAmount = Math.round(daysRemaining * dailyRate * 100) / 100;

                const amountDue = Math.max(0, Math.round((amount - creditAmount) * 100) / 100);
                const newExpiry = calculateExpiryDate(new Date(), billingCycle);

                const subscription = await prisma.subscription.create({
                    data: {
                        userId,
                        planId,
                        billingCycle,
                        startDate: new Date(),
                        expiryDate: newExpiry,
                        amount: amountDue,
                        status: 'PAYMENT_PENDING',
                        proRataCredit: creditAmount,
                        creditApplied: creditAmount,
                        upgradeFromSubId: existingSub.id,
                    },
                });
                return sendResponse(res, 201, subscription, 'Subscription upgrade initiated');
            } else if (requestedPlan.tierLevel < existingSub.plan.tierLevel) {
                // ─── Case 3: Lower Tier -> Downgrade Blocked ───
                return res.status(400).json({
                    success: false,
                    message: 'You currently have an active membership. Downgrades can only be processed through support after your current plan expires.'
                });
            }
        }

        // ─── Case 4: First time subscribing (normal flow) ───
        const start = new Date();
        const expiryDate = calculateExpiryDate(start, billingCycle);

        const subscription = await prisma.subscription.create({
            data: {
                userId,
                planId,
                billingCycle,
                startDate: start,
                expiryDate,
                amount,
                status: 'PAYMENT_PENDING',
            },
        });

        sendResponse(res, 201, subscription, 'Subscription initiated');
    } catch (error) {
        next(error);
    }
};

// PUT /api/subscriptions/:id/pause
const pauseSubscription = async (req, res, next) => {
    try {
        const subscription = await prisma.subscription.update({
            where: { id: req.params.id },
            data: { status: 'PAUSED', pausedAt: new Date() },
        });
        sendResponse(res, 200, subscription, 'Subscription paused');
    } catch (error) {
        next(error);
    }
};

// PUT /api/subscriptions/:id/resume
const resumeSubscription = async (req, res, next) => {
    try {
        const subscription = await prisma.subscription.update({
            where: { id: req.params.id },
            data: { status: 'ACTIVE', resumedAt: new Date() },
        });
        sendResponse(res, 200, subscription, 'Subscription resumed');
    } catch (error) {
        next(error);
    }
};

// PUT /api/subscriptions/:id/extend
const extendSubscription = async (req, res, next) => {
    try {
        const { extraDays } = req.body;
        const sub = await prisma.subscription.findUnique({ where: { id: req.params.id } });
        const newExpiry = new Date(sub.expiryDate);
        newExpiry.setDate(newExpiry.getDate() + (extraDays || 0));

        const subscription = await prisma.subscription.update({
            where: { id: req.params.id },
            data: { expiryDate: newExpiry, status: 'ACTIVE' },
        });
        sendResponse(res, 200, subscription, 'Subscription extended');
    } catch (error) {
        next(error);
    }
};

// PUT /api/subscriptions/:id/cancel
const cancelSubscription = async (req, res, next) => {
    try {
        const subscription = await prisma.subscription.update({
            where: { id: req.params.id },
            data: { status: 'CANCELLED', cancelledAt: new Date() },
            include: { user: { select: { id: true, name: true, phone: true, uniqueUserId: true, smsEnabled: true } }, plan: true },
        });

        // Notify user of plan cancellation — non-fatal
        try {
            if (subscription.user?.phone) {
                const { sendSMS } = require('../services/sms');
                const supportPhone = process.env.SUPPORT_PHONE || '9480198108';
                // DLT SMS 215602: PLAN_CANCELLED_WITH_CONTACT — Var1=name, Var2=support
                await sendSMS({
                    template: 'PLAN_CANCELLED_WITH_CONTACT',
                    mobile: subscription.user.phone,
                    variables: [subscription.user.name, supportPhone],
                });
                // WA: notify family emergency contacts (AYUXA_FAMILY — PLAN_EXPIRED_FAMILY)
                const { sendPlanExpiredFamily } = require('../services/whatsapp');
                const contacts = await prisma.emergencyContact.findMany({ where: { userId: subscription.userId } });
                for (const contact of contacts) {
                    await sendPlanExpiredFamily({
                        phone: contact.phone,
                        familyName: contact.name,
                        clientName: subscription.user.name,
                        ayuxaId: subscription.user.uniqueUserId || subscription.userId,
                    }).catch(() => {});
                }
            }
        } catch (notifErr) {
            logger.warn('cancelSubscription: notification failed (non-fatal):', notifErr.message);
        }

        sendResponse(res, 200, subscription, 'Subscription cancelled');
    } catch (error) {
        next(error);
    }
};

// PUT /api/subscriptions/:id/auto-renew
const toggleAutoRenew = async (req, res, next) => {
    try {
        const sub = await prisma.subscription.findUnique({ where: { id: req.params.id } });
        const subscription = await prisma.subscription.update({
            where: { id: req.params.id },
            data: { autoRenew: !sub.autoRenew },
        });
        sendResponse(res, 200, subscription, `Auto-renew ${subscription.autoRenew ? 'enabled' : 'disabled'}`);
    } catch (error) {
        next(error);
    }
};

// PUT /api/subscriptions/:id/compassionate
const compassionateExtension = async (req, res, next) => {
    try {
        const { days, reason } = req.body;
        const sub = await prisma.subscription.findUnique({ where: { id: req.params.id } });

        const newExpiry = new Date(sub.expiryDate);
        newExpiry.setDate(newExpiry.getDate() + days);

        const subscription = await prisma.subscription.update({
            where: { id: req.params.id },
            data: {
                expiryDate: newExpiry,
                compassionateExtensionDays: sub.compassionateExtensionDays + days,
                compassionateReason: reason,
                status: 'ACTIVE',
            },
        });
        sendResponse(res, 200, subscription, 'Compassionate extension applied');
    } catch (error) {
        next(error);
    }
};

// POST /api/subscriptions/verify (User authenticated)
const verifyUserSubscription = async (req, res, next) => {
    try {
        const { subscriptionId, razorpayPaymentId, razorpaySignature } = req.body;
        // In reality, you verify the razorpay signature here using crypto

        let subscription = await prisma.subscription.findUnique({
            where: { id: subscriptionId },
            include: { plan: { include: { planBenefits: true } } }
        });

        if (!subscription) return res.status(404).json({ success: false, message: 'Subscription not found' });

        if (subscription.upgradeFromSubId) {
            const oldSub = await prisma.subscription.findUnique({
                where: { id: subscription.upgradeFromSubId },
                include: { plan: true }
            });

            if (oldSub) {
                if (oldSub.planId === subscription.planId) {
                    // ─── Case 1: Renewal / Extension ───
                    const updatedOldSub = await prisma.subscription.update({
                        where: { id: oldSub.id },
                        data: {
                            expiryDate: subscription.expiryDate,
                            billingCycle: subscription.billingCycle,
                            status: 'ACTIVE',
                        },
                        include: { plan: { include: { planBenefits: true } } }
                    });

                    // Mark new subscription as EXPIRED (not ACTIVE, to avoid duplicates)
                    await prisma.subscription.update({
                        where: { id: subscription.id },
                        data: { status: 'EXPIRED' }
                    });

                    // Update/reset usage benefits on the original subscription
                    const planBenefits = subscription.plan.planBenefits || [];
                    for (const benefit of planBenefits) {
                        const existingUsage = await prisma.subscriptionUsage.findFirst({
                            where: {
                                subscriptionId: oldSub.id,
                                serviceCategory: benefit.serviceCategory
                            }
                        });
                        if (existingUsage) {
                            await prisma.subscriptionUsage.update({
                                where: { id: existingUsage.id },
                                data: {
                                    totalAllocated: benefit.freeCount,
                                    usedCount: 0,
                                    lockedCount: 0
                                }
                            });
                        } else {
                            await prisma.subscriptionUsage.create({
                                data: {
                                    subscriptionId: oldSub.id,
                                    serviceCategory: benefit.serviceCategory,
                                    totalAllocated: benefit.freeCount,
                                    usedCount: 0,
                                    lockedCount: 0
                                }
                            });
                        }
                    }

                    // Create upgrade history record for RENEW
                    await prisma.subscriptionUpgradeHistory.create({
                        data: {
                            userId: subscription.userId,
                            oldPlanId: oldSub.planId,
                            newPlanId: subscription.planId,
                            oldPlanName: oldSub.plan.name,
                            newPlanName: subscription.plan.name,
                            oldPrice: oldSub.amount,
                            newPrice: subscription.amount,
                            remainingDays: 0,
                            creditApplied: 0,
                            amountPaid: subscription.amount,
                            type: 'RENEW',
                        }
                    });

                    // Send notifications using original sub details
                    subscription = updatedOldSub;
                } else if (subscription.plan.tierLevel > oldSub.plan.tierLevel) {
                    // ─── Case 2: Upgrade ───
                    // Mark old sub as UPGRADED
                    await prisma.subscription.update({
                        where: { id: oldSub.id },
                        data: { status: 'UPGRADED', cancelledAt: new Date() }
                    });

                    const now = new Date();
                    const newExpiry = calculateExpiryDate(now, subscription.billingCycle);

                    // Mark new sub as ACTIVE
                    subscription = await prisma.subscription.update({
                        where: { id: subscription.id },
                        data: { 
                            status: 'ACTIVE',
                            startDate: now,
                            expiryDate: newExpiry,
                        },
                        include: { plan: { include: { planBenefits: true } } }
                    });

                    // Initialize usage for new sub
                    const usageData = subscription.plan.planBenefits.map(benefit => ({
                        subscriptionId: subscription.id,
                        serviceCategory: benefit.serviceCategory,
                        totalAllocated: benefit.freeCount,
                        usedCount: 0,
                        lockedCount: 0
                    }));
                    if (usageData.length > 0) {
                        await prisma.subscriptionUsage.createMany({ data: usageData });
                    }

                    // Record Upgrade History
                    const nowTime = now.getTime();
                    const start = oldSub.startDate.getTime();
                    const expiry = oldSub.expiryDate.getTime();
                    const daysTotal = Math.max(1, Math.round((expiry - start) / (1000 * 60 * 60 * 24)));
                    const daysRemaining = Math.max(0, Math.round((expiry - nowTime) / (1000 * 60 * 60 * 24)));
                    const dailyRate = oldSub.amount / daysTotal;
                    const creditAmount = Math.round(daysRemaining * dailyRate * 100) / 100;

                    await prisma.subscriptionUpgradeHistory.create({
                        data: {
                            userId: subscription.userId,
                            oldPlanId: oldSub.planId,
                            newPlanId: subscription.planId,
                            oldPlanName: oldSub.plan.name,
                            newPlanName: subscription.plan.name,
                            oldPrice: oldSub.amount,
                            newPrice: subscription.amount + creditAmount,
                            remainingDays: Math.floor(daysRemaining),
                            creditApplied: creditAmount,
                            amountPaid: subscription.amount,
                            type: 'UPGRADE',
                        }
                    });
                }
            }
        } else {
            const now = new Date();
            const newExpiry = calculateExpiryDate(now, subscription.billingCycle);

            // Normal first-time activation
            subscription = await prisma.subscription.update({
                where: { id: subscriptionId },
                data: { 
                    status: 'ACTIVE',
                    startDate: now,
                    expiryDate: newExpiry,
                },
                include: { plan: { include: { planBenefits: true } } }
            });

            // Initialize benefits
            const usageData = subscription.plan.planBenefits.map(benefit => ({
                subscriptionId: subscription.id,
                serviceCategory: benefit.serviceCategory,
                totalAllocated: benefit.freeCount,
                usedCount: 0,
                lockedCount: 0
            }));

            if (usageData.length > 0) {
                await prisma.subscriptionUsage.createMany({
                    data: usageData
                });
            }
        }

        // WhatsApp PAYMENT_RECEIVED + DLT SMS PAYMENT_RECEIVED — non-fatal
        const activatedUser = await prisma.user.findUnique({
            where: { id: req.user?.id || subscription.userId },
            select: { id: true, name: true, phone: true, smsEnabled: true },
        }).catch(() => null);
        if (activatedUser?.phone) {
            const { sendPaymentReceived } = require('../services/whatsapp');
            const { sendSMS } = require('../services/sms');
            sendPaymentReceived({
                phone: activatedUser.phone,
                name: activatedUser.name,
                amount: parseFloat(subscription.amount).toFixed(2),
                userId: activatedUser.id,
            }).catch(() => {});
            if (activatedUser.smsEnabled !== false) {
                sendSMS({
                    template: 'PAYMENT_RECEIVED',
                    mobile: activatedUser.phone,
                    variables: [activatedUser.name, parseFloat(subscription.amount).toFixed(2)],
                    userId: activatedUser.id,
                }).catch(() => {});
            }
        }

        sendResponse(res, 200, subscription, 'Subscription activated successfully');
    } catch (error) {
        next(error);
    }
};

// POST /api/subscriptions/:id/calculate-adjustment
const calculateAdjustment = async (req, res, next) => {
    try {
        const { newPlanId, newBillingCycle } = req.body;
        const currentSub = await prisma.subscription.findUnique({
            where: { id: req.params.id },
            include: { plan: true },
        });

        if (!currentSub || currentSub.status !== 'ACTIVE') {
            return res.status(400).json({ success: false, message: 'Invalid or inactive subscription.' });
        }

        const newPlan = await prisma.plan.findUnique({ where: { id: newPlanId } });
        if (!newPlan) {
            return res.status(404).json({ success: false, message: 'New plan not found.' });
        }

        if (newPlan.tierLevel === currentSub.plan.tierLevel) {
            return res.status(400).json({ success: false, message: 'Cannot transition to the same tier.' });
        }

        const now = Date.now();
        const start = currentSub.startDate.getTime();
        const expiry = currentSub.expiryDate.getTime();

        const daysTotal = Math.max(1, (expiry - start) / (1000 * 60 * 60 * 24));
        const dailyRate = currentSub.amount / daysTotal;
        const daysRemaining = Math.max(0, (expiry - now) / (1000 * 60 * 60 * 24));
        const proRataCredit = Math.round((daysRemaining * dailyRate) * 100) / 100;

        let newPlanPrice = 0;
        if (newBillingCycle === 'YEARLY' || newBillingCycle === 12) newPlanPrice = newPlan.yearlyPrice;
        else if (newBillingCycle === 'BIANNUAL' || newBillingCycle === 6) newPlanPrice = newPlan.biannualPrice;
        else newPlanPrice = newPlan.quarterlyPrice;

        const adjustmentAmount = Math.round((newPlanPrice - proRataCredit) * 100) / 100;

        if (adjustmentAmount < 0) {
            return res.status(400).json({
                success: false,
                downgradeBlocked: true,
                message: 'Downgrade not available because remaining credit exceeds selected plan value.',
                proRataCredit,
                newPlanPrice
            });
        }

        sendResponse(res, 200, {
            currentSubId: currentSub.id,
            proRataCredit,
            newPlanPrice,
            amountToPay: adjustmentAmount,
            daysRemaining: Math.floor(daysRemaining)
        });
    } catch (error) {
        next(error);
    }
};

// POST /api/subscriptions/:id/execute-transition
const executeTransition = async (req, res, next) => {
    try {
        const { newPlanId, newBillingCycle, razorpayPaymentId } = req.body;
        
        const result = await prisma.$transaction(async (tx) => {
            const currentSub = await tx.subscription.findUnique({
                where: { id: req.params.id },
                include: { plan: true }
            });

            if (!currentSub || currentSub.status !== 'ACTIVE') {
                throw new Error('Invalid or inactive subscription.');
            }

            const newPlan = await tx.plan.findUnique({ where: { id: newPlanId } });
            if (!newPlan) {
                throw new Error('New plan not found.');
            }

            if (newPlan.tierLevel === currentSub.plan.tierLevel) {
                throw new Error('Cannot transition to the same tier.');
            }

            const now = Date.now();
            const start = currentSub.startDate.getTime();
            const expiry = currentSub.expiryDate.getTime();

            const daysTotal = Math.max(1, (expiry - start) / (1000 * 60 * 60 * 24));
            const dailyRate = currentSub.amount / daysTotal;
            const daysRemaining = Math.max(0, (expiry - now) / (1000 * 60 * 60 * 24));
            const proRataCredit = daysRemaining * dailyRate;

            let newPlanPrice = 0;
            if (newBillingCycle === 'YEARLY' || newBillingCycle === 12) newPlanPrice = newPlan.yearlyPrice;
            else if (newBillingCycle === 'BIANNUAL' || newBillingCycle === 6) newPlanPrice = newPlan.biannualPrice;
            else newPlanPrice = newPlan.quarterlyPrice;

            const expectedAmountToPay = Math.round((newPlanPrice - proRataCredit) * 100) / 100;

            if (expectedAmountToPay < 0) {
                throw new Error('Downgrade not available because remaining credit exceeds selected plan value.');
            }

            if (expectedAmountToPay > 0) {
                if (!razorpayPaymentId) throw new Error('Payment ID is required.');
                const razorpayClient = require('razorpay');
                const rzp = new razorpayClient({
                    key_id: process.env.RAZORPAY_KEY_ID,
                    key_secret: process.env.RAZORPAY_KEY_SECRET,
                });
                const payment = await rzp.payments.fetch(razorpayPaymentId);
                const paymentAmount = payment.amount / 100;

                if (Math.abs(paymentAmount - expectedAmountToPay) > 1) {
                    throw new Error('Payment amount mismatch. Security verification failed.');
                }
            }

            const isDowngrade = newPlan.tierLevel < currentSub.plan.tierLevel;
            const newStatus = isDowngrade ? 'DOWNGRADED' : 'UPGRADED';

            await tx.subscription.update({
                where: { id: req.params.id },
                data: { status: newStatus, cancelledAt: new Date() }
            });

            const { calculateExpiryDate } = require('../utils/helpers');
            const startDate = new Date();
            const expiryDate = calculateExpiryDate(startDate, newBillingCycle);

            const newSubscription = await tx.subscription.create({
                data: {
                    userId: req.user.id,
                    planId: newPlanId,
                    billingCycle: newBillingCycle,
                    startDate: startDate,
                    expiryDate,
                    amount: expectedAmountToPay,
                    status: 'ACTIVE',
                },
            });

            return newSubscription;
        });

        sendResponse(res, 201, result, 'Subscription transitioned successfully');
    } catch (error) {
        if (error.message && (error.message.includes('mismatch') || error.message.includes('Downgrade') || error.message.includes('Invalid') || error.message.includes('tier'))) {
            return res.status(400).json({ success: false, message: error.message });
        }
        next(error);
    }
};

// POST /api/subscriptions/:id/renew
const executeRenew = async (req, res, next) => {
    try {
        const { newBillingCycle, amountPaid } = req.body;
        
        // Find existing sub
        const currentSub = await prisma.subscription.findUnique({
            where: { id: req.params.id }
        });

        if (!currentSub || currentSub.status !== 'ACTIVE') {
            return res.status(400).json({ success: false, message: 'Invalid or inactive subscription.' });
        }

        const { calculateExpiryDate } = require('../utils/helpers');
        // Start from current expiry date, not from today, because it is an extension!
        const start = currentSub.expiryDate;
        const newExpiryDate = calculateExpiryDate(start, newBillingCycle);

        const subscription = await prisma.subscription.update({
            where: { id: req.params.id },
            data: {
                expiryDate: newExpiryDate,
                billingCycle: newBillingCycle, // update billing cycle preference
            },
        });

        sendResponse(res, 200, subscription, 'Subscription renewed successfully');
    } catch (error) {
        next(error);
    }
};

// GET /api/subscriptions/me/active (User authenticated)
// Check if user has active subscriptions that cover booking fees
const checkUserActiveSubscription = async (req, res, next) => {
    try {
        const userId = req.user.id;
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

        if (activeSubs.length > 0) {
            return sendResponse(res, 200, {
                hasActiveSubscription: true,
                subscriptions: activeSubs.map(sub => ({
                    id: sub.id,
                    planId: sub.planId,
                    planName: sub.plan?.name,
                    planType: sub.plan?.planType,
                    expiryDate: sub.expiryDate,
                    autoRenew: sub.autoRenew,
                })),
                message: 'You have active subscriptions',
            });
        }

        sendResponse(res, 200, {
            hasActiveSubscription: false,
            subscriptions: [],
            message: 'No active subscription. Regular charges will apply.',
        });
    } catch (error) {
        next(error);
    }
};

// ─────────────────────────────────────────────────────────────────────────────
//  NEW: Membership Enhancement Endpoints
// ─────────────────────────────────────────────────────────────────────────────

// GET /api/subscriptions/me/memberships
// Returns all active subscriptions grouped by category
const getMemberships = async (req, res, next) => {
    try {
        const userId = req.user.id;
        const subs = await prisma.subscription.findMany({
            where: {
                userId,
                status: { in: ['ACTIVE', 'SCHEDULED_DOWNGRADE', 'EXPIRING'] },
                expiryDate: { gte: new Date() },
            },
            include: {
                plan: {
                    include: { planBenefits: true, billingCycles: true }
                },
                scheduledPlan: { select: { id: true, name: true, tierLevel: true } },
            },
            orderBy: { createdAt: 'desc' },
        });

        // Group by planType (CARE, HOMEMAKER, etc.)
        const grouped = {};
        for (const sub of subs) {
            const category = sub.plan.planType || 'CARE';
            if (!grouped[category]) grouped[category] = [];
            const now = new Date();
            const daysRemaining = Math.max(0, Math.floor((new Date(sub.expiryDate) - now) / (1000 * 60 * 60 * 24)));
            grouped[category].push({
                id: sub.id,
                planId: sub.planId,
                planName: sub.plan.name,
                planType: sub.plan.planType,
                maxConcurrent: sub.plan.maxConcurrent,
                tierLevel: sub.plan.tierLevel,
                status: sub.status,
                billingCycle: sub.billingCycle,
                startDate: sub.startDate,
                expiryDate: sub.expiryDate,
                daysRemaining,
                amount: sub.amount,
                autoRenew: sub.autoRenew,
                scheduledDowngrade: sub.scheduledPlan ? {
                    planId: sub.scheduledPlanId,
                    planName: sub.scheduledPlan.name,
                    activatesOn: sub.scheduledChangeDate,
                } : null,
            });
        }

        // Add latest expired/cancelled subscription if category has no active ones
        const checkCategories = ['CARE', 'HOMEMAKER'];
        for (const cat of checkCategories) {
            if (!grouped[cat] || grouped[cat].length === 0) {
                const lastSub = await prisma.subscription.findFirst({
                    where: {
                        userId,
                        plan: { planType: cat }
                    },
                    include: {
                        plan: {
                            include: { planBenefits: true, billingCycles: true }
                        },
                        scheduledPlan: { select: { id: true, name: true, tierLevel: true } }
                    },
                    orderBy: { expiryDate: 'desc' }
                });

                if (lastSub) {
                    if (!grouped[cat]) grouped[cat] = [];
                    grouped[cat].push({
                        id: lastSub.id,
                        planId: lastSub.planId,
                        planName: lastSub.plan.name,
                        planType: lastSub.plan.planType,
                        maxConcurrent: lastSub.plan.maxConcurrent,
                        tierLevel: lastSub.plan.tierLevel,
                        status: lastSub.status === 'CANCELLED' ? 'CANCELLED' : 'EXPIRED',
                        billingCycle: lastSub.billingCycle,
                        startDate: lastSub.startDate,
                        expiryDate: lastSub.expiryDate,
                        daysRemaining: 0,
                        amount: lastSub.amount,
                        autoRenew: lastSub.autoRenew,
                        scheduledDowngrade: null,
                    });
                }
            }
        }

        sendResponse(res, 200, { memberships: grouped, categories: Object.keys(grouped) });
    } catch (error) {
        next(error);
    }
};

// GET /api/subscriptions/:id/available-upgrades
// Returns plans in the same category with a higher tier level
const getAvailableUpgrades = async (req, res, next) => {
    try {
        const userId = req.user.id;
        const sub = await prisma.subscription.findUnique({
            where: { id: req.params.id },
            include: { plan: true },
        });

        if (!sub || sub.userId !== userId) {
            return res.status(404).json({ success: false, message: 'Subscription not found.' });
        }
        if (sub.status !== 'ACTIVE' && sub.status !== 'SCHEDULED_DOWNGRADE') {
            return res.status(400).json({ success: false, message: 'Only active subscriptions can be upgraded.' });
        }

        const upgrades = await prisma.plan.findMany({
            where: {
                planType: sub.plan.planType,
                tierLevel: { gt: sub.plan.tierLevel },
                isVisible: true,
            },
            include: { billingCycles: true },
            orderBy: { tierLevel: 'asc' },
        });

        sendResponse(res, 200, {
            currentPlan: {
                id: sub.plan.id,
                name: sub.plan.name,
                tierLevel: sub.plan.tierLevel,
                planType: sub.plan.planType,
            },
            availableUpgrades: upgrades,
        });
    } catch (error) {
        next(error);
    }
};

// POST /api/subscriptions/:id/calculate-upgrade
// Preview pro-rata credit and amount due for upgrade
const calculateUpgrade = async (req, res, next) => {
    try {
        const { newPlanId, newBillingCycle } = req.body;
        const userId = req.user.id;

        if (!newPlanId || !newBillingCycle) {
            return res.status(400).json({ success: false, message: 'newPlanId and newBillingCycle are required.' });
        }

        const currentSub = await prisma.subscription.findUnique({
            where: { id: req.params.id },
            include: { plan: true },
        });

        if (!currentSub || currentSub.userId !== userId) {
            return res.status(404).json({ success: false, message: 'Subscription not found.' });
        }
        if (currentSub.status !== 'ACTIVE') {
            return res.status(400).json({ success: false, message: 'Only active subscriptions can be upgraded.' });
        }
        if (new Date(currentSub.expiryDate) < new Date()) {
            return res.status(400).json({ success: false, message: 'Subscription has expired. Please renew instead.' });
        }

        const newPlan = await prisma.plan.findUnique({ where: { id: newPlanId } });
        if (!newPlan) {
            return res.status(404).json({ success: false, message: 'Target plan not found.' });
        }

        // Validate same category
        if (newPlan.planType !== currentSub.plan.planType) {
            return res.status(400).json({ success: false, message: 'Cannot upgrade across plan categories.' });
        }
        // Validate upgrade direction
        if (newPlan.tierLevel <= currentSub.plan.tierLevel) {
            return res.status(400).json({
                success: false,
                isDowngrade: newPlan.tierLevel < currentSub.plan.tierLevel,
                message: newPlan.tierLevel === currentSub.plan.tierLevel
                    ? 'You are already on this plan.'
                    : 'Downgrades are scheduled, not instant. Use schedule-downgrade instead.',
            });
        }

        // Pro-rata calculation
        const now = Date.now();
        const start = currentSub.startDate.getTime();
        const expiry = currentSub.expiryDate.getTime();
        const daysTotal = Math.max(1, Math.round((expiry - start) / (1000 * 60 * 60 * 24)));
        const daysRemaining = now < start ? daysTotal : Math.max(0, Math.round((expiry - now) / (1000 * 60 * 60 * 24)));
        const dailyRate = currentSub.amount / daysTotal;
        const creditAmount = Math.min(currentSub.amount, Math.round(daysRemaining * dailyRate * 100) / 100);

        // Price of new plan
        const cyclePrices = {
            QUARTERLY: newPlan.quarterlyPrice,
            BIANNUAL: newPlan.biannualPrice,
            YEARLY: newPlan.yearlyPrice,
            MONTHLY: newPlan.quarterlyPrice / 3,
        };
        const newPlanPrice = cyclePrices[newBillingCycle] || newPlan.quarterlyPrice;
        const amountDue = Math.max(0, Math.round((newPlanPrice - creditAmount) * 100) / 100);

        sendResponse(res, 200, {
            currentSubId: currentSub.id,
            currentPlan: { id: currentSub.plan.id, name: currentSub.plan.name, price: currentSub.amount },
            newPlan: { id: newPlan.id, name: newPlan.name, price: newPlanPrice },
            calculation: {
                daysTotal,
                daysRemaining,
                dailyRate: Math.round(dailyRate * 100) / 100,
                creditAmount,
                newPlanPrice,
                amountDue,
                paymentRequired: amountDue > 0,
            },
        });
    } catch (error) {
        next(error);
    }
};

// POST /api/subscriptions/:id/upgrade
// Execute upgrade instantly (with or without payment)
const executeUpgrade = async (req, res, next) => {
    try {
        const { newPlanId, newBillingCycle, razorpayPaymentId, razorpayOrderId, razorpaySignature } = req.body;
        const userId = req.user.id;

        if (!newPlanId || !newBillingCycle) {
            return res.status(400).json({ success: false, message: 'newPlanId and newBillingCycle are required.' });
        }

        const result = await prisma.$transaction(async (tx) => {
            const currentSub = await tx.subscription.findUnique({
                where: { id: req.params.id },
                include: { plan: true },
            });

            if (!currentSub || currentSub.userId !== userId) throw Object.assign(new Error('Subscription not found.'), { code: 404 });
            if (currentSub.status !== 'ACTIVE') throw new Error('Only active subscriptions can be upgraded.');
            if (new Date(currentSub.expiryDate) < new Date()) throw new Error('Subscription has expired. Please renew instead.');

            const newPlan = await tx.plan.findUnique({ where: { id: newPlanId } });
            if (!newPlan) throw Object.assign(new Error('Target plan not found.'), { code: 404 });
            if (newPlan.planType !== currentSub.plan.planType) throw new Error('Cannot upgrade across plan categories.');
            if (newPlan.tierLevel <= currentSub.plan.tierLevel) throw new Error('Upgrades must be to a higher tier.');

            // Pro-rata
            const now = Date.now();
            const start = currentSub.startDate.getTime();
            const expiry = currentSub.expiryDate.getTime();
            const daysTotal = Math.max(1, Math.round((expiry - start) / (1000 * 60 * 60 * 24)));
            const daysRemaining = now < start ? daysTotal : Math.max(0, Math.round((expiry - now) / (1000 * 60 * 60 * 24)));
            const dailyRate = currentSub.amount / daysTotal;
            const creditAmount = Math.min(currentSub.amount, Math.round(daysRemaining * dailyRate * 100) / 100);

            const cyclePrices = {
                QUARTERLY: newPlan.quarterlyPrice, BIANNUAL: newPlan.biannualPrice,
                YEARLY: newPlan.yearlyPrice, MONTHLY: newPlan.quarterlyPrice / 3,
            };
            const newPlanPrice = cyclePrices[newBillingCycle] || newPlan.quarterlyPrice;
            const amountDue = Math.max(0, Math.round((newPlanPrice - creditAmount) * 100) / 100);

            // Validate payment if required
            if (amountDue > 0) {
                if (!razorpayPaymentId) throw new Error('Payment ID is required for this upgrade.');
                // Verify signature
                const crypto = require('crypto');
                const keySecret = process.env.RAZORPAY_KEY_SECRET;
                if (razorpayOrderId && razorpaySignature && keySecret) {
                    const expected = crypto.createHmac('sha256', keySecret)
                        .update(`${razorpayOrderId}|${razorpayPaymentId}`)
                        .digest('hex');
                    if (expected !== razorpaySignature) throw new Error('Payment verification failed.');
                }
            }

            // 1. Archive old subscription
            await tx.subscription.update({
                where: { id: currentSub.id },
                data: { status: 'UPGRADED', cancelledAt: new Date() },
            });

            // 2. Create new subscription
            const newExpiry = calculateExpiryDate(new Date(), newBillingCycle);
            const newSub = await tx.subscription.create({
                data: {
                    userId,
                    planId: newPlanId,
                    billingCycle: newBillingCycle,
                    startDate: new Date(),
                    expiryDate: newExpiry,
                    amount: newPlanPrice,
                    status: 'ACTIVE',
                    proRataCredit: creditAmount,
                    creditApplied: creditAmount,
                    upgradeFromSubId: currentSub.id,
                },
                include: { plan: true },
            });

            // 3. Transfer/reset usage benefits
            const oldUsage = await tx.subscriptionUsage.findMany({ where: { subscriptionId: currentSub.id } });
            const newPlanWithBenefits = await tx.plan.findUnique({
                where: { id: newPlanId },
                include: { planBenefits: true },
            });
            if (newPlanWithBenefits?.planBenefits?.length > 0) {
                await tx.subscriptionUsage.createMany({
                    data: newPlanWithBenefits.planBenefits.map(b => ({
                        subscriptionId: newSub.id,
                        serviceCategory: b.serviceCategory,
                        totalAllocated: b.freeCount,
                        usedCount: 0,
                        lockedCount: 0,
                    })),
                });
            }

            // 4. Record upgrade history
            await tx.subscriptionUpgradeHistory.create({
                data: {
                    userId,
                    oldPlanId: currentSub.planId,
                    newPlanId,
                    oldPlanName: currentSub.plan.name,
                    newPlanName: newPlan.name,
                    oldPrice: currentSub.amount,
                    newPrice: newPlanPrice,
                    remainingDays: daysRemaining,
                    creditApplied: creditAmount,
                    amountPaid: amountDue,
                    type: 'UPGRADE',
                },
            });

            return { newSubscription: newSub, creditApplied: creditAmount, amountPaid: amountDue };
        });

        sendResponse(res, 201, result, 'Plan upgraded successfully');
    } catch (error) {
        const statusCode = error.code === 404 ? 404 : 400;
        if (error.message && !error.stack?.includes('PrismaClient')) {
            return res.status(statusCode).json({ success: false, message: error.message });
        }
        next(error);
    }
};

// POST /api/subscriptions/:id/schedule-downgrade
// Schedule a downgrade to activate at expiry
const scheduleDowngrade = async (req, res, next) => {
    try {
        const { newPlanId } = req.body;
        const userId = req.user.id;

        if (!newPlanId) return res.status(400).json({ success: false, message: 'newPlanId is required.' });

        const currentSub = await prisma.subscription.findUnique({
            where: { id: req.params.id },
            include: { plan: true },
        });

        if (!currentSub || currentSub.userId !== userId) {
            return res.status(404).json({ success: false, message: 'Subscription not found.' });
        }
        if (currentSub.status !== 'ACTIVE') {
            return res.status(400).json({ success: false, message: 'Only active subscriptions can have downgrades scheduled.' });
        }

        const newPlan = await prisma.plan.findUnique({ where: { id: newPlanId } });
        if (!newPlan) return res.status(404).json({ success: false, message: 'Target plan not found.' });
        if (newPlan.planType !== currentSub.plan.planType) {
            return res.status(400).json({ success: false, message: 'Cannot schedule downgrade across plan categories.' });
        }
        if (newPlan.tierLevel >= currentSub.plan.tierLevel) {
            return res.status(400).json({ success: false, message: 'This plan is not a downgrade. Use upgrade instead.' });
        }

        const updated = await prisma.subscription.update({
            where: { id: req.params.id },
            data: {
                scheduledPlanId: newPlanId,
                scheduledChangeDate: currentSub.expiryDate,
                status: 'SCHEDULED_DOWNGRADE',
            },
            include: { plan: true, scheduledPlan: true },
        });

        // Record in history
        await prisma.subscriptionUpgradeHistory.create({
            data: {
                userId,
                oldPlanId: currentSub.planId,
                newPlanId,
                oldPlanName: currentSub.plan.name,
                newPlanName: newPlan.name,
                oldPrice: currentSub.amount,
                newPrice: newPlan.quarterlyPrice,
                remainingDays: Math.max(0, Math.round((new Date(currentSub.expiryDate) - Date.now()) / (1000 * 60 * 60 * 24))),
                creditApplied: 0,
                amountPaid: 0,
                type: 'DOWNGRADE_SCHEDULED',
            },
        });

        sendResponse(res, 200, updated, `Downgrade to ${newPlan.name} scheduled for ${currentSub.expiryDate.toDateString()}`);
    } catch (error) {
        next(error);
    }
};

// POST /api/subscriptions/:id/cancel-downgrade
// Cancel a scheduled downgrade and restore status to ACTIVE
const cancelDowngrade = async (req, res, next) => {
    try {
        const userId = req.user.id;
        const currentSub = await prisma.subscription.findUnique({
            where: { id: req.params.id },
            include: { plan: true },
        });

        if (!currentSub || currentSub.userId !== userId) {
            return res.status(404).json({ success: false, message: 'Subscription not found.' });
        }
        if (currentSub.status !== 'SCHEDULED_DOWNGRADE') {
            return res.status(400).json({ success: false, message: 'No scheduled downgrade to cancel.' });
        }

        const updated = await prisma.subscription.update({
            where: { id: req.params.id },
            data: {
                scheduledPlanId: null,
                scheduledChangeDate: null,
                status: 'ACTIVE',
            },
            include: { plan: true },
        });

        // Record in history
        await prisma.subscriptionUpgradeHistory.create({
            data: {
                userId,
                oldPlanId: currentSub.planId,
                newPlanId: currentSub.planId,
                oldPlanName: currentSub.plan.name,
                newPlanName: currentSub.plan.name,
                oldPrice: currentSub.amount,
                newPrice: currentSub.amount,
                remainingDays: 0,
                creditApplied: 0,
                amountPaid: 0,
                type: 'CANCEL_DOWNGRADE',
            },
        });

        sendResponse(res, 200, updated, 'Scheduled downgrade cancelled successfully');
    } catch (error) {
        next(error);
    }
};

// GET /api/subscriptions/me/upgrade-history
// Returns full upgrade/downgrade/renew history for user
const getUpgradeHistory = async (req, res, next) => {
    try {
        const userId = req.user.id;
        const history = await prisma.subscriptionUpgradeHistory.findMany({
            where: { userId },
            include: {
                oldPlan: { select: { id: true, name: true, planType: true, tierLevel: true } },
                newPlan: { select: { id: true, name: true, planType: true, tierLevel: true } },
            },
            orderBy: { createdAt: 'desc' },
        });
        sendResponse(res, 200, history);
    } catch (error) {
        next(error);
    }
};

module.exports = {
    getSubscriptions, createSubscription, initiateUserSubscription, verifyUserSubscription,
    pauseSubscription, resumeSubscription, extendSubscription,
    cancelSubscription, toggleAutoRenew, compassionateExtension,
    checkUserActiveSubscription, calculateAdjustment, executeTransition, executeRenew,
    // New membership enhancement
    getMemberships, getAvailableUpgrades, calculateUpgrade, executeUpgrade,
    scheduleDowngrade, getUpgradeHistory, cancelDowngrade,
};

