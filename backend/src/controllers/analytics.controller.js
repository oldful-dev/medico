const prisma = require('../config/database');

/**
 * GET /api/analytics/state-business
 * Fast state-filtered business overview for Operations Executive & Admins
 */
const getStateBusinessDetails = async (req, res, next) => {
    try {
        const { stateCode } = req.query;

        let cityIds = null;
        let citiesInState = [];

        if (stateCode && stateCode !== 'ALL') {
            citiesInState = await prisma.city.findMany({
                where: {
                    OR: [
                        { stateCode: { startsWith: stateCode, mode: 'insensitive' } },
                        { stateCode: { contains: stateCode, mode: 'insensitive' } },
                    ],
                },
                select: { id: true, name: true, code: true, stateCode: true },
            });
            cityIds = citiesInState.map(c => c.id);
        }

        // If cityIds === null => ALL India ({})
        // If cityIds !== null => Filter strictly by cityIds (even if empty [])
        const userWhere = cityIds !== null ? { cityId: { in: cityIds } } : {};
        const bookingWhere = cityIds !== null ? { cityId: { in: cityIds } } : {};
        const activeBookingWhere = cityIds !== null
            ? { status: { in: ['CONFIRMED', 'ASSIGNED', 'IN_PROGRESS'] }, cityId: { in: cityIds } }
            : { status: { in: ['CONFIRMED', 'ASSIGNED', 'IN_PROGRESS'] } };
        const caregiverWhere = cityIds !== null ? { cityId: { in: cityIds } } : {};
        const pmtWhere = cityIds !== null
            ? {
                status: 'SUCCESS',
                OR: [
                    { booking: { cityId: { in: cityIds } } },
                    { subscription: { user: { cityId: { in: cityIds } } } }
                ]
            }
            : { status: 'SUCCESS' };

        const [totalUsers, totalBookings, activeBookings, caregiversCount, paymentsSum] = await Promise.all([
            prisma.user.count({ where: userWhere }),
            prisma.booking.count({ where: bookingWhere }),
            prisma.booking.count({ where: activeBookingWhere }),
            prisma.caregiver.count({ where: caregiverWhere }),
            prisma.payment.aggregate({
                _sum: { amount: true },
                where: pmtWhere,
            }),
        ]);

        res.json({
            success: true,
            data: {
                stateCode: stateCode || 'ALL',
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
