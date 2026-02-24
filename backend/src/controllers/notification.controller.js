// ──────────────────────────────────────────────
//  Notification Controller
// ──────────────────────────────────────────────

const prisma = require('../config/database');
const { sendResponse, sendPaginatedResponse, paginate } = require('../utils/helpers');
const { sendEmail, sendWhatsApp } = require('../utils/notifications');

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
            select: { email: true, phone: true, name: true },
        });

        let sentCount = 0;

        for (const user of users) {
            if (channel === 'EMAIL' && user.email) {
                await sendEmail({ to: user.email, subject, html: body });
                sentCount++;
            }
            if (channel === 'WHATSAPP' && user.phone) {
                await sendWhatsApp({ phoneNumber: user.phone, templateName: templateId || 'campaign', parameters: [user.name] });
                sentCount++;
            }
        }

        sendResponse(res, 200, { sentCount, totalUsers: users.length }, 'Campaign sent');
    } catch (error) {
        next(error);
    }
};

module.exports = {
    getNotificationLogs, getTemplates, createTemplate, updateTemplate, deleteTemplate,
    sendCampaign,
};
