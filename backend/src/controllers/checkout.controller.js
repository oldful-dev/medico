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
const DIAGNOSTIC_FITNESS_CATEGORIES = [
    'BLOOD_TEST', 'SCAN_ECG', 'PHYSIO_FITNESS', 'DIAGNOSTICS_FITNESS',
    'DIAGNOSTICS', 'FITNESS'
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

        let serviceRecord = null;
        if (serviceCategory) {
            serviceRecord = await prisma.service.findFirst({
                where: {
                    OR: [
                        { slug: serviceCategory.toLowerCase().replace(/_/g, '-') },
                        { slug: serviceCategory.toLowerCase() },
                        { name: { equals: serviceCategory, mode: 'insensitive' } },
                    ]
                }
            });
        }

        // Fetch service charge configuration
        const lookupCategory = serviceCategory?.toUpperCase?.() || serviceCategory;
        let config = await prisma.serviceCharge.findUnique({
            where: { serviceCategory: lookupCategory }
        });

        if (!config && lookupCategory && lookupCategory.includes('-')) {
            config = await prisma.serviceCharge.findUnique({
                where: { serviceCategory: lookupCategory.replace(/-/g, '_') }
            });
        }

        // Fallback: If no config exists for this specific slug/name, try to match by its parent category
        if (!config && serviceRecord) {
            if (serviceRecord.category) {
                config = await prisma.serviceCharge.findUnique({
                    where: { serviceCategory: serviceRecord.category.toUpperCase() }
                });
            }
            if (!config && serviceRecord.serviceType) {
                config = await prisma.serviceCharge.findUnique({
                    where: { serviceCategory: serviceRecord.serviceType.toUpperCase() }
                });
            }
        }

        let serviceFeeVal = Number(vendorFee);
        let bookingFee = 299;
        let platformFee = 50;
        let taxPercentage = 18;
        let isSubscriptionEligible = true;
        let convenienceFee = 0;
        let emergencyFee = 0;
        let visitFee = 0;
        let nightCharge = 0;
        let surgeCharge = 0;

        if (config && config.isActive) {
            bookingFee = config.bookingFee;
            platformFee = config.platformFee;
            taxPercentage = config.taxPercentage;
            isSubscriptionEligible = config.isSubscriptionEligible;
            convenienceFee = config.convenienceFee || 0;
            emergencyFee = config.emergencyFee || 0;
            visitFee = config.visitFee || 0;
            nightCharge = config.nightCharge || 0;
            surgeCharge = config.surgeCharge || 0;
            if (config.serviceFee > 0) {
                serviceFeeVal = config.serviceFee;
            }
        }

        let benefitDiscount = 0;
        let benefitApplied = false;
        let remainingCountAfterOrder = 0;

        // Determine which plan type is required to waive fees for this service
        let requiredPlanType = null;
        if (serviceRecord) {
            requiredPlanType = serviceRecord.serviceType === 'HOME_ESSENTIALS' ? 'HOMEMAKER' : 'CARE';
        } else if (serviceCategory) {
            const upper = serviceCategory.toUpperCase().replace(/-/g, '_');
            if (CARE_CATEGORIES.includes(upper)) requiredPlanType = 'CARE';
            else if (HOME_CATEGORIES.includes(upper)) requiredPlanType = 'HOMEMAKER';
        }

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

        // GST calculation logic:
        // - Home Essential Service: GST applies on the total bill (vendorFee + diagnosticFee + bookingFee + platformFee + extra fees)
        // - All Other Services (Normal, Diagnostic, Fitness, Doctor, Nurse, etc.): GST applies ONLY on the extra/admin fees (bookingFee + platformFee + other extra fees), NOT on the service/doctor/diagnostic fee (vendorFee + diagnosticFee)
        const isHomeEssential = 
            (serviceRecord?.serviceType === 'HOME_ESSENTIALS') || 
            (serviceRecord?.category === 'HOME_ESSENTIALS') ||
            (requiredPlanType === 'HOMEMAKER') ||
            (serviceCategory && HOME_CATEGORIES.includes(serviceCategory.toUpperCase().replace(/-/g, '_')));

        const extraFeesSum = bookingFee + platformFee + convenienceFee + emergencyFee + visitFee + nightCharge + surgeCharge;
        const effectiveTaxRate = (taxPercentage > 0 ? taxPercentage : 18) / 100;

        let taxableAmount = 0;
        if (isHomeEssential) {
            taxableAmount = serviceFeeVal + Number(diagnosticFee) + extraFeesSum;
        } else {
            taxableAmount = extraFeesSum;
        }

        const taxes = Math.round(taxableAmount * effectiveTaxRate * 100) / 100;
        const totalAmount = serviceFeeVal + Number(diagnosticFee) + extraFeesSum + taxes;

        res.status(200).json({
            success: true,
            data: {
                totalAmount,
                requiredPlanType,
                taxPercentage: taxPercentage > 0 ? taxPercentage : 18,
                breakdown: {
                    vendorFee: serviceFeeVal,
                    diagnosticFee: Number(diagnosticFee),
                    bookingFee,
                    platformFee,
                    convenienceFee,
                    emergencyFee,
                    visitFee,
                    nightCharge,
                    surgeCharge,
                    taxes,
                    ayuxaServiceFee: extraFeesSum,
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

// @desc    Calculate checkout savings when upgrading to membership
// @route   POST /api/v1/checkout/calculate-membership-savings
// @access  Private
exports.calculateMembershipSavings = async (req, res) => {
    try {
        const { serviceCategory, vendorFee = 0, diagnosticFee = 0, planId, billingCycle } = req.body;
        const userId = req.user.id;

        if (!planId || !billingCycle) {
            return res.status(400).json({ success: false, message: 'planId and billingCycle are required.' });
        }

        const plan = await prisma.plan.findUnique({
            where: { id: planId }
        });
        if (!plan) {
            return res.status(404).json({ success: false, message: 'Selected plan not found.' });
        }

        // Fetch plan price
        let planPrice = 0;
        if (billingCycle === 'YEARLY') planPrice = plan.yearlyPrice;
        else if (billingCycle === 'BIANNUAL') planPrice = plan.biannualPrice;
        else planPrice = plan.quarterlyPrice;

        // Resolve service record
        let serviceRecord = null;
        if (serviceCategory) {
            serviceRecord = await prisma.service.findFirst({
                where: {
                    OR: [
                        { slug: serviceCategory.toLowerCase().replace(/_/g, '-') },
                        { slug: serviceCategory.toLowerCase() },
                        { name: { equals: serviceCategory, mode: 'insensitive' } },
                    ]
                }
            });
        }

        // Fetch service charge configuration
        const lookupCategory = serviceCategory?.toUpperCase?.() || serviceCategory;
        let config = await prisma.serviceCharge.findUnique({
            where: { serviceCategory: lookupCategory }
        });

        if (!config && lookupCategory && lookupCategory.includes('-')) {
            config = await prisma.serviceCharge.findUnique({
                where: { serviceCategory: lookupCategory.replace(/-/g, '_') }
            });
        }

        if (!config && serviceRecord) {
            if (serviceRecord.category) {
                config = await prisma.serviceCharge.findUnique({
                    where: { serviceCategory: serviceRecord.category.toUpperCase() }
                });
            }
            if (!config && serviceRecord.serviceType) {
                config = await prisma.serviceCharge.findUnique({
                    where: { serviceCategory: serviceRecord.serviceType.toUpperCase() }
                });
            }
        }

        let serviceFeeVal = Number(vendorFee);
        let bookingFee = 299;
        let platformFee = 50;
        let taxPercentage = 18;
        let convenienceFee = 0;
        let emergencyFee = 0;
        let visitFee = 0;
        let nightCharge = 0;
        let surgeCharge = 0;

        if (config && config.isActive) {
            bookingFee = config.bookingFee;
            platformFee = config.platformFee;
            taxPercentage = config.taxPercentage;
            convenienceFee = config.convenienceFee || 0;
            emergencyFee = config.emergencyFee || 0;
            visitFee = config.visitFee || 0;
            nightCharge = config.nightCharge || 0;
            surgeCharge = config.surgeCharge || 0;
            if (config.serviceFee > 0) {
                serviceFeeVal = config.serviceFee;
            }
        }

        // Determine required plan type
        let requiredPlanType = null;
        if (serviceRecord) {
            requiredPlanType = serviceRecord.serviceType === 'HOME_ESSENTIALS' ? 'HOMEMAKER' : 'CARE';
        } else if (serviceCategory) {
            const upper = serviceCategory.toUpperCase().replace(/-/g, '_');
            if (CARE_CATEGORIES.includes(upper)) requiredPlanType = 'CARE';
            else if (HOME_CATEGORIES.includes(upper)) requiredPlanType = 'HOMEMAKER';
        }

        const isHomeEssential = requiredPlanType === 'HOMEMAKER';
        const effectiveTaxRate = (taxPercentage > 0 ? taxPercentage : 18) / 100;

        // Math without upgrade
        const extraFeesSumWithout = bookingFee + platformFee + convenienceFee + emergencyFee + visitFee + nightCharge + surgeCharge;
        let taxableWithout = isHomeEssential ? (serviceFeeVal + Number(diagnosticFee) + extraFeesSumWithout) : extraFeesSumWithout;
        const taxesWithout = Math.round(taxableWithout * effectiveTaxRate * 100) / 100;
        const totalWithout = serviceFeeVal + Number(diagnosticFee) + extraFeesSumWithout + taxesWithout;

        // Math with upgrade (waived booking fee and platform fee based on Plan configuration)
        let waiveBooking = true;
        let waivePlatform = true;
        let waiveGst = true;

        if (plan.metadata && typeof plan.metadata === 'object') {
            if (plan.metadata.bookingFeeWaived !== undefined) waiveBooking = !!plan.metadata.bookingFeeWaived;
            if (plan.metadata.platformFeeWaived !== undefined) waivePlatform = !!plan.metadata.platformFeeWaived;
            if (plan.metadata.gstOnFeeWaived !== undefined) waiveGst = !!plan.metadata.gstOnFeeWaived;
        }

        const waivedBookingFee = waiveBooking ? bookingFee : 0;
        const waivedPlatformFee = waivePlatform ? platformFee : 0;

        const effectiveBookingFee = bookingFee - waivedBookingFee;
        const effectivePlatformFee = platformFee - waivedPlatformFee;

        const extraFeesSumWith = effectiveBookingFee + effectivePlatformFee + convenienceFee + emergencyFee + visitFee + nightCharge + surgeCharge;
        let taxableWith = isHomeEssential ? (serviceFeeVal + Number(diagnosticFee) + extraFeesSumWith) : extraFeesSumWith;

        let taxesWith = 0;
        if (waiveGst) {
            taxesWith = Math.round(taxableWith * effectiveTaxRate * 100) / 100;
        } else {
            taxesWith = taxesWithout;
        }

        const totalWith = serviceFeeVal + Number(diagnosticFee) + extraFeesSumWith + taxesWith;

        const bookingFeeWaivedVal = waivedBookingFee;
        const platformFeeWaivedVal = waivedPlatformFee;
        const gstWaivedVal = Math.max(0, Math.round((taxesWithout - taxesWith) * 100) / 100);
        const totalSavings = bookingFeeWaivedVal + platformFeeWaivedVal + gstWaivedVal;

        const finalPayable = totalWith + planPrice;

        res.status(200).json({
            success: true,
            data: {
                bookingFeeWaived: bookingFeeWaivedVal,
                platformFeeWaived: platformFeeWaivedVal,
                gstWaived: gstWaivedVal,
                totalSavings,
                finalPayable,
                bookingTotalWithoutUpgrade: totalWithout,
                bookingTotalWithUpgrade: totalWith,
                planPrice
            }
        });
    } catch (error) {
        console.error('Calculate membership savings error:', error);
        res.status(500).json({ success: false, message: 'Server Error', error: error.message });
    }
};

