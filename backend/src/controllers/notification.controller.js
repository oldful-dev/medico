// ──────────────────────────────────────────────
//  Notification Controller
// ──────────────────────────────────────────────

const prisma = require('../config/database');
const { sendResponse, sendPaginatedResponse, paginate } = require('../utils/helpers');
const { sendEmail, sendWhatsApp } = require('../utils/notifications');
const { sendPushToUsers } = require('../utils/pushNotification.service');
const { logger } = require('../config/logger');

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

// ─── Campaign ──────────────────────────────
//
// Note: there is no admin-editable "template" concept for real transactional
// sends — WhatsApp/SMS templates are DLT-registered with the telecom
// regulator (see services/whatsapp/templates.js, services/sms/templates.js)
// and cannot be created or edited via any API; the template text stored
// there is documentation only. A NotificationTemplate CRUD API + admin UI
// used to exist here implying otherwise (editing a row had zero effect on
// what was actually sent) — removed rather than left as a misleading
// no-op. The campaign feature below uses its own hardcoded, pre-approved
// marketing template list (see admin's NotificationsPage.jsx), unrelated
// to that removed table.

// POST /api/notifications/send-campaign
const sendCampaign = async (req, res, next) => {
    try {
        const { channel, templateId, cityId, subject, body, mediaUrl } = req.body;

        const where = {};
        if (cityId) where.cityId = cityId;

        const users = await prisma.user.findMany({
            where: { ...where, status: 'ACTIVE' },
            select: { id: true, email: true, phone: true, name: true, fcmDeviceToken: true },
        });

        let sentCount = 0;
        let failedCount = 0;
        let errors = [];

        // EMAIL Channel — templateId (optional) picks a structured marketing
        // template (ANNOUNCEMENT_UPDATE/PROMO_OFFER); otherwise falls back to
        // the free-form subject/body this channel already supported.
        if (channel === 'EMAIL') {
            const emailService = require('../services/email');
            const useTemplate = EMAIL_CAMPAIGN_TEMPLATES.includes(templateId) ? templateId : null;
            for (const user of users) {
                if (user.email) {
                    try {
                        let sent;
                        if (useTemplate === 'ANNOUNCEMENT_UPDATE') {
                            sent = await emailService.sendAnnouncementUpdate({ to: user.email, name: user.name, userId: user.id });
                        } else if (useTemplate === 'PROMO_OFFER') {
                            sent = await emailService.sendPromoOfferEmail({ to: user.email, name: user.name, discount: body, userId: user.id });
                        } else {
                            sent = await sendEmail({ to: user.email, subject, html: body, userId: user.id, isMarketing: true });
                        }
                        if (sent) sentCount++; else failedCount++;
                    } catch (err) {
                        failedCount++;
                        logger.warn('Campaign email failed for recipient', { userId: user.id, message: err.message });
                    }
                }
            }
        }

        // WHATSAPP Channel — templateId must be a campaignEligible key in the
        // real WHATSAPP_TEMPLATES registry (services/whatsapp/templates.js),
        // not a separately-maintained allowlist that can drift from it.
        if (channel === 'WHATSAPP') {
            const { WHATSAPP_TEMPLATES } = require('../services/whatsapp');
            const campaignTemplateKeys = Object.keys(WHATSAPP_TEMPLATES).filter(k => WHATSAPP_TEMPLATES[k].campaignEligible);
            if (!templateId || !campaignTemplateKeys.includes(templateId)) {
                return sendResponse(res, 400, null, `Invalid WhatsApp campaign template. Must be one of: ${campaignTemplateKeys.join(', ')}`);
            }
            const template = WHATSAPP_TEMPLATES[templateId];
            if (template.mediaRequired && !mediaUrl) {
                return sendResponse(res, 400, null, `Template "${templateId}" requires an image — upload one before sending this campaign.`);
            }
            // Var1 is always the recipient's name; Var2 (when the template needs
            // one — ANNOUNCEMENT_UPDATE's link slug, PROMO_OFFER's discount) comes
            // from the campaign form's free-text `body` field.
            const templateVarCount = template.variables || 0;
            const batchStartedAt = new Date();
            for (const user of users) {
                if (user.phone) {
                    try {
                        const parameters = templateVarCount >= 2 ? [user.name, body || ''] : [user.name];
                        const sent = await sendWhatsApp({ phoneNumber: user.phone, templateName: templateId, parameters, mediaUrl: mediaUrl || null, userId: user.id });
                        if (sent) sentCount++; else failedCount++;
                    } catch (err) {
                        failedCount++;
                        logger.warn('Campaign WhatsApp failed for recipient', { userId: user.id, message: err.message });
                    }
                }
            }
            // sendWhatsApp (utils/notifications.js) only returns true/false —
            // the real Fast2SMS/API error string is written to notificationLog
            // (not propagated up through the boolean return), so pull it back
            // from there instead of showing the admin a bare failure count.
            if (failedCount > 0) {
                const failedLogs = await prisma.notificationLog.findMany({
                    where: { channel: 'WHATSAPP', isSent: false, createdAt: { gte: batchStartedAt } },
                    select: { errorMessage: true },
                });
                errors = [...new Set(failedLogs.map(l => l.errorMessage).filter(Boolean))];
            }
        }

        // PUSH Channel (Mobile App + Web)
        if (channel === 'PUSH') {
            const userIds = users.map(u => u.id);
            sentCount = await sendPushToUsers(userIds, { title: subject, body });
        }

        // SMS Channel — disabled. Fast2SMS/TRAI DLT regulations forbid
        // free-text SMS to real phone numbers; every registered SMS_TEMPLATES
        // entry today is transactional-only (OTP, order status, SOS, etc —
        // see services/sms/templates.js), none are approved for broadcast.
        // Re-enable once a real "Update" template is DLT-approved: add it to
        // SMS_TEMPLATES with campaignEligible: true and mirror the WHATSAPP
        // branch's pattern above instead of sending free body text.
        if (channel === 'SMS') {
            return sendResponse(res, 400, null, 'SMS campaigns are not available — no DLT-approved broadcast template is registered yet. Use WhatsApp or Email for this campaign.');
        }

        if (failedCount > 0) {
            logger.warn('Campaign completed with failures', { channel, sentCount, failedCount, totalUsers: users.length, errors });
        }

        const message = failedCount > 0 && errors.length > 0
            ? `Campaign sent — ${sentCount} succeeded, ${failedCount} failed: ${errors.join('; ')}`
            : 'Campaign sent';
        sendResponse(res, 200, { sentCount, failedCount, totalUsers: users.length, errors }, message);
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
// GET /api/notifications/campaign-templates — live template lists for the
// admin campaign form, sourced from the real registries instead of a
// separately hardcoded array that can drift out of sync with them.
const EMAIL_CAMPAIGN_TEMPLATES = ['ANNOUNCEMENT_UPDATE', 'PROMO_OFFER'];
const getCampaignTemplates = async (req, res, next) => {
    try {
        const { WHATSAPP_TEMPLATES } = require('../services/whatsapp');
        const whatsapp = Object.entries(WHATSAPP_TEMPLATES)
            .filter(([, t]) => t.campaignEligible)
            .map(([key, t]) => ({ value: key, label: `${t.description || key} (${t.waba})`, mediaRequired: !!t.mediaRequired, variables: t.variables || 0 }));
        const email = EMAIL_CAMPAIGN_TEMPLATES.map(key => ({ value: key, label: key.replace(/_/g, ' ') }));
        sendResponse(res, 200, { whatsapp, email });
    } catch (error) {
        next(error);
    }
};

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
    getNotificationLogs,
    getCampaignTemplates,
    sendCampaign, getMyNotifications, markNotificationRead, markAllNotificationsRead,
    sendTestPush,
};
