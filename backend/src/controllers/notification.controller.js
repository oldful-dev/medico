// ──────────────────────────────────────────────
//  Notification Controller
// ──────────────────────────────────────────────

const prisma = require('../config/database');
const { sendResponse, sendPaginatedResponse, paginate } = require('../utils/helpers');
const { sendEmail, sendWhatsApp } = require('../utils/notifications');
const { sendPushToUsers } = require('../utils/pushNotification.service');

// GET /api/notifications/logs
const getNotificationLogs = async (req, res, next) => {
    try {
        const { page, limit, skip } = paginate(req.query);
        const { channel, cityId, isSent } = req.query;

        const where = {};
        if (channel) where.channel = channel;
        if (cityId) where.cityId = cityId;
        if (isSent !== undefined) where.isSent = isSent === 'true';

        const [logs, total] = await Promise.all([
            prisma.notificationLog.findMany({
                where,
                skip,
                take: limit,
                orderBy: { createdAt: 'desc' },
            }),
            prisma.notificationLog.count({ where }),
        ]);

        sendPaginatedResponse(res, logs, total, page, limit);
    } catch (error) {
        next(error);
    }
};

// ─── Templates ─────────────────────────────

// GET /api/notifications/templates
const getTemplates = async (req, res, next) => {
    try {
        const { channel } = req.query;
        const where = {};
        if (channel) where.channel = channel;

        const templates = await prisma.notificationTemplate.findMany({ where, orderBy: { name: 'asc' } });
        sendResponse(res, 200, templates);
    } catch (error) {
        next(error);
    }
};

// POST /api/notifications/templates
const createTemplate = async (req, res, next) => {
    try {
        const template = await prisma.notificationTemplate.create({ data: req.body });
        sendResponse(res, 201, template, 'Template created');
    } catch (error) {
        next(error);
    }
};

// PUT /api/notifications/templates/:id
const updateTemplate = async (req, res, next) => {
    try {
        const template = await prisma.notificationTemplate.update({
            where: { id: req.params.id },
            data: req.body,
        });
        sendResponse(res, 200, template, 'Template updated');
    } catch (error) {
        next(error);
    }
};

// DELETE /api/notifications/templates/:id
const deleteTemplate = async (req, res, next) => {
    try {
        await prisma.notificationTemplate.delete({ where: { id: req.params.id } });
        sendResponse(res, 200, null, 'Template deleted');
    } catch (error) {
        next(error);
    }
};

// ─── Campaign ──────────────────────────────

// POST /api/notifications/send-campaign
const sendCampaign = async (req, res, next) => {
    try {
        const { channel, templateId, cityId, subject, body } = req.body;

        const where = {};
        if (cityId) where.cityId = cityId;

        const users = await prisma.user.findMany({
            where: { ...where, status: 'ACTIVE' },
            select: { id: true, email: true, phone: true, name: true, fcmDeviceToken: true },
        });

        let sentCount = 0;

        // EMAIL Channel
        if (channel === 'EMAIL') {
            for (const user of users) {
                if (user.email) {
                    const sent = await sendEmail({ to: user.email, subject, html: body, userId: user.id, isMarketing: true });
                    if (sent) sentCount++;
                }
            }
        }

        // WHATSAPP Channel
        if (channel === 'WHATSAPP') {
            for (const user of users) {
                if (user.phone) {
                    const sent = await sendWhatsApp({ phoneNumber: user.phone, templateName: templateId || 'campaign', parameters: [user.name], userId: user.id });
                    if (sent) sentCount++;
                }
            }
        }

        // PUSH Channel (Mobile App + Web)
        if (channel === 'PUSH') {
            const userIds = users.map(u => u.id);
            sentCount = await sendPushToUsers(userIds, { title: subject, body });
        }

        sendResponse(res, 200, { sentCount, totalUsers: users.length }, 'Campaign sent');
    } catch (error) {
        next(error);
    }
};

// GET /api/notifications/my  (app user)
const getMyNotifications = async (req, res, next) => {
    try {
        const { page, limit, skip } = paginate(req.query);
        const [notifications, total] = await Promise.all([
            prisma.notificationLog.findMany({
                where: { recipientId: req.user.id, recipientType: 'user' },
                orderBy: { createdAt: 'desc' },
                skip,
                take: limit,
            }),
            prisma.notificationLog.count({ where: { recipientId: req.user.id, recipientType: 'user' } }),
        ]);
        return sendPaginatedResponse(res, notifications, total, page, limit);
    } catch (error) {
        next(error);
    }
};

// PUT /api/notifications/my/:id/read  (app user — mark single as read)
const markNotificationRead = async (req, res, next) => {
    try {
        const notification = await prisma.notificationLog.findFirst({
            where: { id: req.params.id, recipientId: req.user.id },
        });
        if (!notification) {
            return res.status(404).json({ success: false, message: 'Notification not found' });
        }

        const updated = await prisma.notificationLog.update({
            where: { id: req.params.id },
            data: { isRead: true, readAt: new Date() },
        });

        sendResponse(res, 200, updated, 'Marked as read');
    } catch (error) {
        next(error);
    }
};

// PUT /api/notifications/my/read-all  (app user — mark all as read)
const markAllNotificationsRead = async (req, res, next) => {
    try {
        const result = await prisma.notificationLog.updateMany({
            where: {
                recipientId: req.user.id,
                recipientType: 'user',
                isRead: false,
            },
            data: { isRead: true, readAt: new Date() },
        });

        sendResponse(res, 200, { count: result.count }, `${result.count} notifications marked as read`);
    } catch (error) {
        next(error);
    }
};

// POST /api/notifications/test-push (admin — send test push to current user)
const sendTestPush = async (req, res, next) => {
    try {
        const { title = 'Test Notification', body = 'If you see this, push notifications work!' } = req.body;

        const sent = await sendPushToUsers([req.user.id], { title, body });

        sendResponse(res, 200, { sent }, `Test push sent (status: ${sent ? 'sent' : 'failed'})`);
    } catch (error) {
        next(error);
    }
};

module.exports = {
    getNotificationLogs, getTemplates, createTemplate, updateTemplate, deleteTemplate,
    sendCampaign, getMyNotifications, markNotificationRead, markAllNotificationsRead,
    sendTestPush,
};
