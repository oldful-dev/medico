// ──────────────────────────────────────────────
//  Standard-Rate Floor
//
//  Computes the minimum amount a booking should be charged when the user is
//  NOT covered by an active, unexhausted subscription benefit for that
//  service — i.e. full serviceFee + unwaived bookingFee/platformFee/extra
//  fees + tax on the fee portion, mirroring calculateCheckout's own
//  (unwaived) breakdown (checkout.controller.js ~88-184).
//
//  Exists because both booking creation (booking.controller.js, Scenario C
//  "pay full price after quota exhausted") and payment initiation
//  (payment.controller.js) previously trusted whatever `amount` the client
//  sent once isPaidBooking=true was set — with no server-side check that the
//  amount actually included the un-waived fees. A client-side bug could
//  (and did) send a subscription-waived total while still passing
//  isPaidBooking=true. This floor closes that gap independent of any
//  client-supplied flag.
// ──────────────────────────────────────────────

const prisma = require('../config/database');

const HOME_CATEGORIES = [
    'PLUMBING_ELECTRICAL', 'APPLIANCE_REPAIR', 'AC_APPLIANCE_REPAIR', 'HOME_ESSENTIALS',
    'BILL_PAYMENT', 'BANK_PAPERWORK', 'PAPERWORK_LEGAL',
    'LEGAL_PAPERWORK', 'TECH_HELPER', 'DEEP_CLEANING', 'GROCERY_RUN',
    'GROCERY_DELIVERY', 'TRANSPORTATION',
];

/**
 * @param {object} service - the Service row this booking is for (needs slug, category, serviceType, basePrice)
 * @param {number} vendorFee - the service/vendor fee portion the client is charging (usually service.basePrice or booking.amount's service component)
 * @returns {Promise<number>} minimum acceptable total charge with no subscription waiver applied
 */
async function computeStandardRateFloor(service, vendorFee) {
    if (!service) return 0;

    const lookupCategory = service.slug.toUpperCase().replace(/-/g, '_');
    let config = await prisma.serviceCharge.findUnique({ where: { serviceCategory: lookupCategory } });

    if (!config && service.category) {
        config = await prisma.serviceCharge.findUnique({ where: { serviceCategory: service.category.toUpperCase() } });
    }
    if (!config && service.serviceType) {
        config = await prisma.serviceCharge.findUnique({ where: { serviceCategory: service.serviceType.toUpperCase() } });
    }

    let bookingFee = 299;
    let platformFee = 50;
    let taxPercentage = 18;
    let convenienceFee = 0, emergencyFee = 0, visitFee = 0, nightCharge = 0, surgeCharge = 0;

    if (config && config.isActive) {
        bookingFee = config.bookingFee;
        platformFee = config.platformFee;
        taxPercentage = config.taxPercentage > 0 ? config.taxPercentage : 18;
        convenienceFee = config.convenienceFee || 0;
        emergencyFee = config.emergencyFee || 0;
        visitFee = config.visitFee || 0;
        nightCharge = config.nightCharge || 0;
        surgeCharge = config.surgeCharge || 0;
    }

    const isHomeEssential =
        service.serviceType === 'HOME_ESSENTIALS' ||
        service.category === 'HOME_ESSENTIALS' ||
        HOME_CATEGORIES.includes(lookupCategory);

    const extraFeesSum = bookingFee + platformFee + convenienceFee + emergencyFee + visitFee + nightCharge + surgeCharge;
    const taxableAmount = isHomeEssential ? (Number(vendorFee) + extraFeesSum) : extraFeesSum;
    const taxes = Math.round(taxableAmount * (taxPercentage / 100) * 100) / 100;

    return Number(vendorFee) + extraFeesSum + taxes;
}

module.exports = { computeStandardRateFloor };
