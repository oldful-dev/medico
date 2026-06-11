const prisma = require('../config/database');

// ─── Service category → required planType mapping ───────────────────────────
const CARE_CATEGORIES = [
    'DOCTOR_HOME_VISIT', 'HOME_NURSE', 'HOSPITAL_TRIP',
    'PHYSIO_FITNESS', 'BLOOD_TEST', 'SCAN_ECG',
];
const HOME_CATEGORIES = [
    'PLUMBING_ELECTRICAL', 'APPLIANCE_REPAIR', 'HOME_ESSENTIALS',
    'BILL_PAYMENT', 'BANK_PAPERWORK', 'PAPERWORK_LEGAL',
    'LEGAL_PAPERWORK', 'TECH_HELPER', 'DEEP_CLEANING', 'GROCERY_RUN',
    'APPLIANCE_REPAIR', 'TRANSPORTATION',
];

/**
 * Returns 'CARE', 'HOMEMAKER', or null based on service category.
 */
async function getPlanTypeForCategory(category) {
    if (!category) return null;
    try {
        const service = await prisma.service.findFirst({
            where: {
                OR: [
                    { slug: category.toLowerCase().replace(/_/g, '-') },
                    { slug: category.toLowerCase() },
                    { name: { equals: category, mode: 'insensitive' } },
                ]
            }
        });
        if (service) {
            return service.serviceType === 'HOME_ESSENTIALS' ? 'HOMEMAKER' : 'CARE';
        }
    } catch (err) {
        console.warn('Dynamic plan type resolution failed, falling back:', err);
    }

    const upper = category.toUpperCase().replace(/-/g, '_');
    if (CARE_CATEGORIES.includes(upper)) return 'CARE';
    if (HOME_CATEGORIES.includes(upper)) return 'HOMEMAKER';
    return null;
}

// @desc    Calculate checkout total with subscription benefits (category-aware)
// @route   POST /api/v1/checkout/calculate
// @access  Private
exports.calculateCheckout = async (req, res) => {
    try {
        const { serviceCategory, vendorFee = 0, diagnosticFee = 0 } = req.body;
        const userId = req.user.id;

        // Fetch service charge configuration
        let config = await prisma.serviceCharge.findUnique({
            where: { serviceCategory: serviceCategory?.toUpperCase?.() || serviceCategory }
        });

        // Fallback: If no config exists for this specific slug/name, try to match by its parent category
        if (!config && serviceCategory) {
            const service = await prisma.service.findFirst({
                where: {
                    OR: [
                        { slug: serviceCategory.toLowerCase().replace(/_/g, '-') },
                        { slug: serviceCategory.toLowerCase() },
                        { name: { equals: serviceCategory, mode: 'insensitive' } },
                    ]
                }
            });
            if (service) {
                if (service.category) {
                    config = await prisma.serviceCharge.findUnique({
                        where: { serviceCategory: service.category.toUpperCase() }
                    });
                }
                if (!config && service.serviceType) {
                    config = await prisma.serviceCharge.findUnique({
                        where: { serviceCategory: service.serviceType.toUpperCase() }
                    });
                }
            }
        }

        let bookingFee = config && config.isActive ? config.bookingFee : 0;
        let platformFee = config && config.isActive ? config.platformFee : 0;
        let taxPercentage = config && config.isActive ? config.taxPercentage : 0;
        let isSubscriptionEligible = config && config.isActive ? config.isSubscriptionEligible : true;

        let benefitDiscount = 0;
        let benefitApplied = false;
        let remainingCountAfterOrder = 0;

        // Determine which plan type is required to waive fees for this service
        const requiredPlanType = await getPlanTypeForCategory(serviceCategory);

        // Only check for a matching-category subscription
        if (requiredPlanType && isSubscriptionEligible) {
            const activeSubscription = await prisma.subscription.findFirst({
                where: {
                    userId,
                    status: 'ACTIVE',
                    expiryDate: { gte: new Date() },
                    plan: { planType: requiredPlanType },
                },
                include: { plan: { select: { planType: true } } },
            });

            if (activeSubscription) {
                // Benefit applies! Waive booking and platform fees
                benefitDiscount = bookingFee + platformFee;
                bookingFee = 0;
                platformFee = 0;
                benefitApplied = true;
            }
        }

        // GST applies only to fee lines (bookingFee + platformFee), NOT to vendor/diagnostic fees
        // Base vendor fee = 0% GST per PRD
        // taxPercentage comes from the ServiceCharge row (admin-configurable); falls back to 18%
        const effectiveTaxRate = (taxPercentage > 0 ? taxPercentage : 18) / 100;
        const taxableAmount = bookingFee + platformFee;
        const taxes = Math.round(taxableAmount * effectiveTaxRate * 100) / 100;

        const totalAmount = Number(vendorFee) + Number(diagnosticFee) + bookingFee + platformFee + taxes;

        res.status(200).json({
            success: true,
            data: {
                totalAmount,
                requiredPlanType,
                breakdown: {
                    vendorFee: Number(vendorFee),
                    diagnosticFee: Number(diagnosticFee),
                    bookingFee,
                    platformFee,
                    taxes,
                    ayuxaServiceFee: bookingFee + platformFee,
                    benefitDiscount: -benefitDiscount,
                },
                benefitApplied,
                remainingCountAfterOrder,
            }
        });
    } catch (error) {
        console.error('Checkout calculate error:', error);
        res.status(500).json({ success: false, message: 'Server Error', error: error.message });
    }
};
