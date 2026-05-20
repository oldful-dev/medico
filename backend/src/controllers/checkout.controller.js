const prisma = require('../config/database');

// @desc    Calculate checkout total with subscription benefits
// @route   POST /api/v1/checkout/calculate
// @access  Private
exports.calculateCheckout = async (req, res) => {
    try {
        const { serviceCategory, vendorFee = 0, diagnosticFee = 0 } = req.body;
        const userId = req.user.id;

        // Fetch service charge configuration
        const config = await prisma.serviceCharge.findUnique({
            where: { serviceCategory }
        });

        let bookingFee = config && config.isActive ? config.bookingFee : 0;
        let platformFee = config && config.isActive ? config.platformFee : 0;
        let taxPercentage = config && config.isActive ? config.taxPercentage : 0;
        let isSubscriptionEligible = config && config.isActive ? config.isSubscriptionEligible : true;

        let benefitDiscount = 0;
        let benefitApplied = false;
        let remainingCountAfterOrder = 0;

        // Find active subscription for user
        const activeSubscription = await prisma.subscription.findFirst({
            where: {
                userId,
                status: 'ACTIVE',
                expiryDate: { gte: new Date() }
            }
        });

        // If user has active subscription, ALL services are free (no booking/platform fees)
        if (activeSubscription) {
            // Benefit applies! AYUXA booking and platform fees are waived
            benefitDiscount = bookingFee + platformFee;
            bookingFee = 0;
            platformFee = 0;
            benefitApplied = true;
        }

        const taxableAmount = Number(vendorFee) + Number(diagnosticFee);
        const taxes = Math.round(taxableAmount * (taxPercentage / 100) * 100) / 100;
        const totalAmount = Number(vendorFee) + Number(diagnosticFee) + bookingFee + platformFee + taxes;

        res.status(200).json({
            success: true,
            data: {
                totalAmount,
                breakdown: {
                    vendorFee: Number(vendorFee),
                    diagnosticFee: Number(diagnosticFee),
                    bookingFee,
                    platformFee,
                    taxes,
                    ayuxaServiceFee: bookingFee + platformFee,
                    benefitDiscount: -benefitDiscount
                },
                benefitApplied,
                remainingCountAfterOrder
            }
        });
    } catch (error) {
        console.error('Checkout calculate error:', error);
        res.status(500).json({ success: false, message: 'Server Error', error: error.message });
    }
};

