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
        
        // Ensure user does not already have an ACTIVE or PENDING subscription in the same category
        const requestedPlan = await prisma.plan.findUnique({ where: { id: planId } });
        if (!requestedPlan) return res.status(404).json({ success: false, message: 'Plan not found.' });

        const existingSub = await prisma.subscription.findFirst({
            where: {
                userId,
                status: 'ACTIVE',
                plan: { planType: requestedPlan.planType },
            },
            include: { plan: true }
        });

        if (existingSub) {
            return res.status(400).json({ 
                success: false, 
                message: `You already have an active ${existingSub.plan.planType} plan. Please use Change Plan instead.` 
            });
        }

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

        const subscription = await prisma.subscription.update({
            where: { id: subscriptionId },
            data: { status: 'ACTIVE' },
            include: { plan: { include: { planBenefits: true } } }
        });

        // Initialize benefits for the user based on planBenefits
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

module.exports = {
    getSubscriptions, createSubscription, initiateUserSubscription, verifyUserSubscription,
    pauseSubscription, resumeSubscription, extendSubscription,
    cancelSubscription, toggleAutoRenew, compassionateExtension,
    checkUserActiveSubscription, calculateAdjustment, executeTransition, executeRenew
};
