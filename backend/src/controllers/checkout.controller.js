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
function getPlanTypeForCategory(category) {
    if (!category) return null;
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
        const config = await prisma.serviceCharge.findUnique({
            where: { serviceCategory: serviceCategory?.toUpperCase?.() || serviceCategory }
        });

        let bookingFee = config && config.isActive ? config.bookingFee : 0;
        let platformFee = config && config.isActive ? config.platformFee : 0;
        let taxPercentage = config && config.isActive ? config.taxPercentage : 0;
        let isSubscriptionEligible = config && config.isActive ? config.isSubscriptionEligible : true;

        let benefitDiscount = 0;
        let benefitApplied = false;
        let remainingCountAfterOrder = 0;

        // Determine which plan type is required to waive fees for this service
        const requiredPlanType = getPlanTypeForCategory(serviceCategory);

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
        const taxableAmount = bookingFee + platformFee;
        const taxes = Math.round(taxableAmount * 0.18 * 100) / 100;

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
