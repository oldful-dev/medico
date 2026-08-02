const prisma = require('../config/database');

/**
 * GET /api/analytics/state-business
 * Fast state-filtered business overview for Operations Executive & Admins
 */
const getStateBusinessDetails = async (req, res, next) => {
    try {
        const { stateCode = 'DL' } = req.query;

        // Fetch cities in state
        const citiesInState = await prisma.city.findMany({
            where: {
                OR: [
                    { stateCode: { equals: stateCode, mode: 'insensitive' } },
                    { name: { contains: stateCode, mode: 'insensitive' } },
                ],
            },
            select: { id: true, name: true, code: true, stateCode: true },
        });

        const cityIds = citiesInState.map(c => c.id);

        const [totalUsers, totalBookings, activeBookings, caregiversCount, paymentsSum] = await Promise.all([
            prisma.user.count({ where: cityIds.length ? { cityId: { in: cityIds } } : {} }),
            prisma.booking.count({ where: cityIds.length ? { cityId: { in: cityIds } } : {} }),
            prisma.booking.count({ where: { status: { in: ['CONFIRMED', 'ASSIGNED', 'IN_PROGRESS'] }, ...(cityIds.length ? { cityId: { in: cityIds } } : {}) } }),
            prisma.caregiver.count({ where: cityIds.length ? { cityId: { in: cityIds } } : {} }),
            prisma.payment.aggregate({
                _sum: { amount: true },
                where: { status: 'SUCCESS', ...(cityIds.length ? { booking: { cityId: { in: cityIds } } } : {}) },
            }),
        ]);

        res.json({
            success: true,
            data: {
                stateCode,
                cities: citiesInState,
                metrics: {
                    totalRevenue: paymentsSum._sum.amount || 0,
                    activeBookings,
                    totalBookings,
                    totalUsers,
                    totalCaregivers: caregiversCount,
                },
            },
        });
    } catch (error) {
        next(error);
    }
};

module.exports = {
    getStateBusinessDetails,
};
