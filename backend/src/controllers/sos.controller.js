// ──────────────────────────────────────────────
//  SOS Emergency Controller
// ──────────────────────────────────────────────

const prisma = require('../config/database');
const { sendResponse, sendPaginatedResponse, paginate } = require('../utils/helpers');
const { sendSOSNotifications } = require('../utils/notifications');

// GET /api/sos
const getSOSAlerts = async (req, res, next) => {
    try {
        const { page, limit, skip } = paginate(req.query);
        const { status, cityId } = req.query;

        const where = {};
        if (req.cityFilter) where.cityId = req.cityFilter;
        if (status) where.status = status;
        if (cityId) where.cityId = cityId;

        const [alerts, total] = await Promise.all([
            prisma.sOSAlert.findMany({
                where,
                skip,
                take: limit,
                include: {
                    user: { select: { id: true, name: true, uniqueUserId: true, phone: true } },
                    city: { select: { name: true } },
                    responder: { select: { name: true, phone: true } },
                },
                orderBy: { createdAt: 'desc' },
            }),
            prisma.sOSAlert.count({ where }),
        ]);

        sendPaginatedResponse(res, alerts, total, page, limit);
    } catch (error) {
        next(error);
    }
};

// POST /api/sos  (App user triggers SOS)
const createSOSAlert = async (req, res, next) => {
    try {
        const userId = req.user.id;
        const { latitude, longitude, addressSnapshot } = req.body;

        const user = await prisma.user.findUnique({
            where: { id: userId },
            include: { emergencyContacts: true, city: true },
        });

        const alert = await prisma.sOSAlert.create({
            data: {
                userId,
                cityId: user.cityId,
                latitude,
                longitude,
                addressSnapshot,
            },
        });

        // Send notifications asynchronously
        sendSOSNotifications({
            user,
            location: addressSnapshot || `${latitude}, ${longitude}`,
            familyContacts: user.emergencyContacts,
        }).catch(() => { });

        sendResponse(res, 201, alert, 'SOS alert created — help is on the way');
    } catch (error) {
        next(error);
    }
};

// PUT /api/sos/:id/assign
const assignResponder = async (req, res, next) => {
    try {
        const { responderId } = req.body;
        const alert = await prisma.sOSAlert.update({
            where: { id: req.params.id },
            data: { responderId, status: 'RESPONDING' },
        });
        sendResponse(res, 200, alert, 'Responder assigned');
    } catch (error) {
        next(error);
    }
};

// PUT /api/sos/:id/resolve
const resolveSOSAlert = async (req, res, next) => {
    try {
        const { resolvedNotes, callLogNotes } = req.body;
        const alert = await prisma.sOSAlert.update({
            where: { id: req.params.id },
            data: {
                status: 'RESOLVED',
                resolvedAt: new Date(),
                resolvedNotes,
                callLogNotes,
            },
        });
        sendResponse(res, 200, alert, 'SOS alert resolved');
    } catch (error) {
        next(error);
    }
};

// PUT /api/sos/:id/notify
const updateNotificationStatus = async (req, res, next) => {
    try {
        const { adminNotified, familyNotified } = req.body;
        const data = {};
        if (adminNotified !== undefined) data.adminNotified = adminNotified;
        if (familyNotified !== undefined) data.familyNotified = familyNotified;

        const alert = await prisma.sOSAlert.update({
            where: { id: req.params.id },
            data,
        });
        sendResponse(res, 200, alert, 'Notification status updated');
    } catch (error) {
        next(error);
    }
};

module.exports = { getSOSAlerts, createSOSAlert, assignResponder, resolveSOSAlert, updateNotificationStatus };
