// ──────────────────────────────────────────────
//  Reports & Analytics Controller
// ──────────────────────────────────────────────

const prisma = require('../config/database');
const { sendResponse } = require('../utils/helpers');

/**
 * Get City IDs belonging to a specific stateCode (e.g. DL, UP, MH, KA, TN, WB)
 */
async function getCityIdsForState(stateCode) {
    if (!stateCode || stateCode === 'ALL') return null;
    const cities = await prisma.city.findMany({
        where: {
            OR: [
                { stateCode: { equals: stateCode, mode: 'insensitive' } },
                { name: { contains: stateCode, mode: 'insensitive' } },
            ],
        },
        select: { id: true }
    });
    return cities.map(c => c.id);
}

// GET /api/reports/revenue-by-city
const revenueByCity = async (req, res, next) => {
    try {
        const { stateCode } = req.query;
        const cityWhere = (stateCode && stateCode !== 'ALL') ? {
            OR: [
                { stateCode: { equals: stateCode, mode: 'insensitive' } },
                { name: { contains: stateCode, mode: 'insensitive' } },
            ]
        } : {};

        const cities = await prisma.city.findMany({
            where: cityWhere,
            select: { id: true, name: true, code: true },
        });

        const results = await Promise.all(
            cities.map(async (city) => {
                const [bookingPmts, subPmts] = await Promise.all([
                    prisma.payment.aggregate({
                        where: { status: 'SUCCESS', booking: { cityId: city.id } },
                        _sum: { amount: true }
                    }),
                    prisma.payment.aggregate({
                        where: { status: 'SUCCESS', subscription: { user: { cityId: city.id } } },
                        _sum: { amount: true }
                    })
                ]);

                const userCount = await prisma.user.count({ where: { cityId: city.id } });

                return {
                    name: city.name,
                    code: city.code,
                    totalRevenue: (bookingPmts._sum.amount || 0) + (subPmts._sum.amount || 0),
                    userCount: userCount,
                };
            })
        );

        sendResponse(res, 200, results);
    } catch (error) {
        next(error);
    }
};

// GET /api/reports/revenue-by-plan
const revenueByPlan = async (req, res, next) => {
    try {
        const plans = await prisma.plan.findMany({
            select: { id: true, name: true },
        });

        const results = await Promise.all(
            plans.map(async (plan) => {
                const payments = await prisma.payment.aggregate({
                    where: { status: 'SUCCESS', subscription: { planId: plan.id } },
                    _sum: { amount: true },
                    _count: { id: true },
                });
                return {
                    plan: plan.name,
                    totalRevenue: payments._sum.amount || 0,
                    totalSubscriptions: payments._count.id || 0,
                };
            })
        );

        sendResponse(res, 200, results);
    } catch (error) {
        next(error);
    }
};

// GET /api/reports/service-usage
const serviceUsage = async (req, res, next) => {
    try {
        const { stateCode } = req.query;
        const cityIds = await getCityIdsForState(stateCode);

        const services = await prisma.service.findMany({
            select: { id: true, name: true },
        });

        const results = await Promise.all(
            services.map(async (service) => {
                const whereClause = {
                    serviceId: service.id,
                    ...(cityIds && cityIds.length ? { cityId: { in: cityIds } } : {})
                };
                const bookings = await prisma.booking.groupBy({
                    by: ['status'],
                    where: whereClause,
                    _count: { id: true },
                });

                const total = bookings.reduce((sum, b) => sum + b._count.id, 0);
                const completed = bookings.find(b => b.status === 'COMPLETED')?._count.id || 0;

                return {
                    service: service.name,
                    name: service.name,
                    count: total,
                    totalBookings: total,
                    completedBookings: completed,
                    completionRate: total > 0 ? ((completed / total) * 100).toFixed(1) : 0,
                };
            })
        );

        sendResponse(res, 200, results);
    } catch (error) {
        next(error);
    }
};

// GET /api/reports/caregiver-performance
const caregiverPerformance = async (req, res, next) => {
    try {
        const caregivers = await prisma.caregiver.findMany({
            select: {
                id: true, name: true, specialization: true,
                performanceRating: true, totalBookings: true,
                city: { select: { name: true } },
            },
            orderBy: { performanceRating: 'desc' },
            take: 50,
        });

        sendResponse(res, 200, caregivers);
    } catch (error) {
        next(error);
    }
};

// GET /api/reports/refund-analysis
const refundAnalysis = async (req, res, next) => {
    try {
        const refunds = await prisma.payment.groupBy({
            by: ['refundType'],
            where: {
                status: { in: ['REFUND_INITIATED', 'REFUNDED'] },
            },
            _count: { id: true },
            _sum: { refundAmount: true },
        });

        const totalRefunds = await prisma.payment.aggregate({
            where: { status: { in: ['REFUND_INITIATED', 'REFUNDED'] } },
            _sum: { refundAmount: true },
            _count: { id: true },
        });

        sendResponse(res, 200, {
            byType: refunds,
            totalRefundAmount: totalRefunds._sum.refundAmount || 0,
            totalRefundCount: totalRefunds._count.id || 0,
        });
    } catch (error) {
        next(error);
    }
};

// GET /api/reports/customer-retention
const customerRetention = async (req, res, next) => {
    try {
        const totalUsers = await prisma.user.count();
        const activeSubscriptions = await prisma.subscription.count({ where: { status: 'ACTIVE' } });
        const renewedSubscriptions = await prisma.subscription.count({
            where: {
                status: 'ACTIVE',
                user: {
                    subscriptions: { some: { status: 'EXPIRED' } },
                },
            },
        });

        sendResponse(res, 200, {
            totalUsers,
            activeSubscribers: activeSubscriptions,
            retentionRate: totalUsers > 0 ? ((activeSubscriptions / totalUsers) * 100).toFixed(1) : 0,
            renewalCount: renewedSubscriptions,
        });
    } catch (error) {
        next(error);
    }
};

// GET /api/reports/dashboard-summary
const dashboardSummary = async (req, res, next) => {
    try {
        const { stateCode } = req.query;
        const cityIds = await getCityIdsForState(stateCode);

        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);
        const nextWeek = new Date();
        nextWeek.setDate(nextWeek.getDate() + 7);

        const userWhere = cityIds && cityIds.length ? { cityId: { in: cityIds } } : {};
        const bookingWhere = cityIds && cityIds.length ? { cityId: { in: cityIds } } : {};
        const subWhere = cityIds && cityIds.length ? { user: { cityId: { in: cityIds } } } : {};
        const pmtWhere = cityIds && cityIds.length ? {
            OR: [
                { booking: { cityId: { in: cityIds } } },
                { subscription: { user: { cityId: { in: cityIds } } } }
            ]
        } : {};
        const sosWhere = cityIds && cityIds.length ? { cityId: { in: cityIds } } : {};

        const [
            totalUsers, totalBookings, activeSubscriptions,
            totalRevenue, activeSOSAlerts, pendingBookings,
            todayBookings, totalServices, expiringSubscriptions
        ] = await Promise.all([
            prisma.user.count({ where: userWhere }),
            prisma.booking.count({ where: bookingWhere }),
            prisma.subscription.count({ where: { status: 'ACTIVE', ...subWhere } }),
            prisma.payment.aggregate({ where: { status: 'SUCCESS', ...pmtWhere }, _sum: { amount: true } }),
            prisma.sOSAlert.count({ where: { status: { not: 'RESOLVED' }, ...sosWhere } }),
            prisma.booking.count({ where: { status: 'CONFIRMED', caregiverId: null, ...bookingWhere } }),
            prisma.booking.count({ where: { createdAt: { gte: todayStart }, ...bookingWhere } }),
            prisma.service.count({ where: { isEnabled: true } }),
            prisma.subscription.count({ where: { status: 'ACTIVE', expiryDate: { lte: nextWeek, gte: new Date() }, ...subWhere } }),
        ]);

        sendResponse(res, 200, {
            totalUsers,
            totalBookings,
            activeSubscriptions,
            totalRevenue: totalRevenue._sum.amount || 0,
            activeSOSAlerts,
            pendingBookings,
            todayBookings,
            totalServices,
            expiringSubscriptions
        });
    } catch (error) {
        next(error);
    }
};

// GET /api/reports/csv/:type
const exportCSV = async (req, res, next) => {
    try {
        const { type } = req.params;
        let data = [];
        let headers = [];

        switch (type) {
            case 'users':
                data = await prisma.user.findMany({
                    select: { uniqueUserId: true, name: true, phone: true, email: true, status: true, healthTag: true, createdAt: true },
                });
                headers = ['User ID', 'Name', 'Phone', 'Email', 'Status', 'Health Tag', 'Created At'];
                break;

            case 'bookings':
                data = await prisma.booking.findMany({
                    select: { bookingCode: true, status: true, amount: true, scheduledDate: true, createdAt: true },
                    include: { user: { select: { name: true } }, service: { select: { name: true } } },
                });
                headers = ['Booking Code', 'User', 'Service', 'Status', 'Amount', 'Scheduled Date', 'Created At'];
                break;

            default:
                return sendResponse(res, 400, null, 'Invalid report type');
        }

        let csv = headers.join(',') + '\n';
        data.forEach(row => {
            const values = Object.values(row).map(v => typeof v === 'object' ? JSON.stringify(v) : `"${v}"`);
            csv += values.join(',') + '\n';
        });

        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename=${type}_report.csv`);
        res.status(200).send(csv);
    } catch (error) {
        next(error);
    }
};

// GET /api/reports/alerts
const getAlertFeed = async (req, res, next) => {
    try {
        const nextWeek = new Date();
        nextWeek.setDate(nextWeek.getDate() + 7);

        const [sosCount, pendingBookings, expiringSubs] = await Promise.all([
            prisma.sOSAlert.count({ where: { status: { not: 'RESOLVED' } } }),
            prisma.booking.count({ where: { status: 'CONFIRMED', caregiverId: null } }),
            prisma.subscription.count({ where: { status: 'ACTIVE', expiryDate: { lte: nextWeek, gte: new Date() } } }),
        ]);

        sendResponse(res, 200, {
            sosCount,
            pendingBookings,
            expiringSubs,
        });
    } catch (error) {
        next(error);
    }
};

module.exports = {
    revenueByCity,
    revenueByPlan,
    serviceUsage,
    caregiverPerformance,
    refundAnalysis,
    customerRetention,
    dashboardSummary,
    exportCSV,
    getAlertFeed,
};
