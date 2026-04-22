// ──────────────────────────────────────────────
//  Reports & Analytics Controller
// ──────────────────────────────────────────────

const prisma = require('../config/database');
const { sendResponse } = require('../utils/helpers');

// GET /api/reports/revenue-by-city
const revenueByCity = async (req, res, next) => {
    try {
        const cities = await prisma.city.findMany({
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
        const services = await prisma.service.findMany({
            select: { id: true, name: true },
        });

        const results = await Promise.all(
            services.map(async (service) => {
                const bookings = await prisma.booking.groupBy({
                    by: ['status'],
                    where: { serviceId: service.id },
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
        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);
        const nextWeek = new Date();
        nextWeek.setDate(nextWeek.getDate() + 7);

        const [
            totalUsers, totalBookings, activeSubscriptions,
            totalRevenue, activeSOSAlerts, pendingBookings,
            todayBookings, totalServices, expiringSubscriptions
        ] = await Promise.all([
            prisma.user.count(),
            prisma.booking.count(),
            prisma.subscription.count({ where: { status: 'ACTIVE' } }),
            prisma.payment.aggregate({ where: { status: 'SUCCESS' }, _sum: { amount: true } }),
            prisma.sOSAlert.count({ where: { status: { not: 'RESOLVED' } } }),
            // Count bookings that need caregiver assignment: CONFIRMED status but no assigned caregiver
            prisma.booking.count({ where: { status: 'CONFIRMED', caregiverId: null } }),
            prisma.booking.count({ where: { createdAt: { gte: todayStart } } }),
            prisma.service.count({ where: { isEnabled: true } }),
            prisma.subscription.count({ where: { status: 'ACTIVE', expiryDate: { lte: nextWeek, gte: new Date() } } }),
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
                headers = ['Booking Code', 'User', 'Service', 'Status', 'Amount', 'Date', 'Created At'];
                break;

            case 'payments':
                data = await prisma.payment.findMany({
                    select: { amount: true, status: true, paymentMethod: true, createdAt: true },
                    include: { user: { select: { name: true } } },
                });
                headers = ['User', 'Amount', 'Method', 'Status', 'Date'];
                break;

            default:
                return res.status(400).json({ success: false, message: 'Invalid export type' });
        }

        // Simple CSV generation
        const csvRows = [headers.join(',')];
        data.forEach((row) => {
            const values = Object.values(row).map(v =>
                typeof v === 'object' && v !== null ? JSON.stringify(v) : String(v ?? '')
            );
            csvRows.push(values.join(','));
        });

        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename=${type}_export.csv`);
        res.send(csvRows.join('\n'));
    } catch (error) {
        next(error);
    }
};

// GET /api/reports/alerts
const getAlertFeed = async (req, res, next) => {
    try {
        const [sos, bookings, payments, tickets] = await Promise.all([
            prisma.sOSAlert.findMany({
                where: { status: 'ACTIVE' },
                take: 5,
                orderBy: { createdAt: 'desc' },
                include: { user: { select: { name: true } } }
            }),
            prisma.booking.findMany({
                where: { status: { in: ['PENDING', 'SLA_BREACH'] } },
                take: 5,
                orderBy: { createdAt: 'desc' },
                include: { user: { select: { name: true } }, service: { select: { name: true } } }
            }),
            prisma.payment.findMany({
                where: { status: 'FAILED' },
                take: 5,
                orderBy: { createdAt: 'desc' },
                include: { user: { select: { name: true } } }
            }),
            prisma.supportTicket.findMany({
                where: { status: 'open' },
                take: 5,
                orderBy: { createdAt: 'desc' }
            })
        ]);

        const feed = [
            ...sos.map(a => ({ id: a.id, type: 'SOS', title: `Critical: SOS by ${a.user?.name || 'User'}`, time: a.createdAt, href: '/sos' })),
            ...bookings.map(b => ({ id: b.id, type: 'BOOKING', title: `Pending: ${b.service?.name} for ${b.user?.name}`, time: b.createdAt, href: '/bookings' })),
            ...payments.map(p => ({ id: p.id, type: 'PAYMENT', title: `Failed: ₹${p.amount} pmt by ${p.user?.name}`, time: p.createdAt, href: '/payments' })),
            ...tickets.map(t => ({ id: t.id, type: 'TICKET', title: `Support: ${t.ticketCode} - ${t.subject}`, time: t.createdAt, href: '/support' }))
        ].sort((a, b) => new Date(b.time) - new Date(a.time));

        sendResponse(res, 200, feed.slice(0, 10)); // Top 10 most recent
    } catch (error) {
        next(error);
    }
};

module.exports = {
    revenueByCity, revenueByPlan, serviceUsage, caregiverPerformance,
    refundAnalysis, customerRetention, dashboardSummary, exportCSV,
    getAlertFeed,
};
