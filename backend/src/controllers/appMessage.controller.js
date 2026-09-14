// ──────────────────────────────────────────────
//  App Message Controller — spec 6.2/6.3/6.4 "Wish & Information"
//  Admin-authored popup shown once per customer on app open, with
//  server-tracked dismissal state (spec 6.4: "tracked per customer and
//  per message").
//
//  Dismissal state machine, per (userId, appMessageId, messageVersion):
//    no row            -- Dismiss --> DISMISSED_ONCE (re-show after 24h)
//    DISMISSED_ONCE    -- 24h elapsed + Dismiss again --> DISMISSED_FINAL (never again)
//    no row / any row  -- OK / Agree --> ACKNOWLEDGED (never again)
// ──────────────────────────────────────────────

const prisma = require('../config/database');
const { sendResponse } = require('../utils/helpers');

const DISMISS_COOLDOWN_MS = 24 * 60 * 60 * 1000;

// GET /api/app-messages/active - Customer-facing: the active message this
// user should still be shown, or null if none / already resolved / still
// inside its 24h dismiss cooldown / outside its validity window / targeted
// at a different city. First fetch of a message for this user records
// VIEWED (spec 6.5 "track whether a customer has viewed... the message").
const getActiveMessage = async (req, res, next) => {
    try {
        const now = new Date();
        const message = await prisma.appMessage.findFirst({
            where: {
                isActive: true,
                OR: [{ startsAt: null }, { startsAt: { lte: now } }],
                AND: [{ OR: [{ endsAt: null }, { endsAt: { gte: now } }] }],
            },
            orderBy: { updatedAt: 'desc' },
        });
        if (!message) return sendResponse(res, 200, null);

        // Unauthenticated callers (shouldn't normally happen — route requires
        // authenticateUser — but stay defensive) just get the raw message.
        if (!req.user?.id) return sendResponse(res, 200, message);

        if (message.targetCityId) {
            const user = await prisma.user.findUnique({ where: { id: req.user.id }, select: { cityId: true } });
            if (user?.cityId !== message.targetCityId) return sendResponse(res, 200, null);
        }

        const key = {
            userId_appMessageId_messageVersion: {
                userId: req.user.id,
                appMessageId: message.id,
                messageVersion: message.version,
            },
        };
        const dismissal = await prisma.appMessageDismissal.findUnique({ where: key });

        if (dismissal) {
            if (dismissal.status === 'ACKNOWLEDGED' || dismissal.status === 'DISMISSED_FINAL') {
                return sendResponse(res, 200, null);
            }
            if (dismissal.status === 'DISMISSED_ONCE') {
                const elapsed = Date.now() - new Date(dismissal.firstDismissedAt).getTime();
                if (elapsed < DISMISS_COOLDOWN_MS) return sendResponse(res, 200, null);
            }
        } else {
            await prisma.appMessageDismissal.create({
                data: { userId: req.user.id, appMessageId: message.id, messageVersion: message.version, status: 'VIEWED' },
            }).catch(() => {}); // best-effort — a failed view-record must never block showing the popup
        }

        sendResponse(res, 200, message);
    } catch (error) {
        next(error);
    }
};

// POST /api/app-messages/:id/dismiss - Customer-facing: record a Dismiss.
// First dismiss -> DISMISSED_ONCE (re-shown after 24h). Second dismiss
// (already DISMISSED_ONCE) -> DISMISSED_FINAL (never shown again).
const dismissMessage = async (req, res, next) => {
    try {
        const message = await prisma.appMessage.findUnique({ where: { id: req.params.id } });
        if (!message) return res.status(404).json({ success: false, message: 'Message not found' });

        const key = {
            userId_appMessageId_messageVersion: {
                userId: req.user.id,
                appMessageId: message.id,
                messageVersion: message.version,
            },
        };
        const existing = await prisma.appMessageDismissal.findUnique({ where: key });

        // Defensive: a stale/duplicate client call must never move a
        // terminal status (ACKNOWLEDGED/DISMISSED_FINAL) backwards. VIEWED
        // is not terminal — it's the normal state after getActiveMessage's
        // auto-record, and a real Dismiss from there must proceed.
        if (existing && existing.status !== 'DISMISSED_ONCE' && existing.status !== 'VIEWED') {
            return sendResponse(res, 200, existing);
        }

        const nextStatus = existing?.status === 'DISMISSED_ONCE' ? 'DISMISSED_FINAL' : 'DISMISSED_ONCE';

        const record = await prisma.appMessageDismissal.upsert({
            where: key,
            update: { status: nextStatus },
            create: {
                userId: req.user.id,
                appMessageId: message.id,
                messageVersion: message.version,
                status: nextStatus,
            },
        });

        sendResponse(res, 200, record);
    } catch (error) {
        next(error);
    }
};

// POST /api/app-messages/:id/acknowledge - Customer-facing: record OK (or
// Agree, for a requiresAgreement message) — never shown again for this
// version.
const acknowledgeMessage = async (req, res, next) => {
    try {
        const message = await prisma.appMessage.findUnique({ where: { id: req.params.id } });
        if (!message) return res.status(404).json({ success: false, message: 'Message not found' });

        const key = {
            userId_appMessageId_messageVersion: {
                userId: req.user.id,
                appMessageId: message.id,
                messageVersion: message.version,
            },
        };

        const record = await prisma.appMessageDismissal.upsert({
            where: key,
            update: { status: 'ACKNOWLEDGED' },
            create: {
                userId: req.user.id,
                appMessageId: message.id,
                messageVersion: message.version,
                status: 'ACKNOWLEDGED',
            },
        });

        sendResponse(res, 200, record);
    } catch (error) {
        next(error);
    }
};

// GET /api/app-messages - Admin only: list all messages
const getAllMessages = async (req, res, next) => {
    try {
        const messages = await prisma.appMessage.findMany({
            orderBy: { createdAt: 'desc' },
        });
        sendResponse(res, 200, messages);
    } catch (error) {
        next(error);
    }
};

// GET /api/app-messages/:id/engagement - Admin only: per-customer dismissal
// state for one message (spec 6.4 "tracked per customer" — surfaced here).
const getMessageEngagement = async (req, res, next) => {
    try {
        const rows = await prisma.appMessageDismissal.findMany({
            where: { appMessageId: req.params.id },
            include: { user: { select: { id: true, name: true, uniqueUserId: true } } },
            orderBy: { updatedAt: 'desc' },
        });
        sendResponse(res, 200, rows);
    } catch (error) {
        next(error);
    }
};

// POST /api/app-messages - Admin only: create a message
const createMessage = async (req, res, next) => {
    try {
        const { title, body, type, imageUrl, targetCityId, startsAt, endsAt, isActive, requiresAgreement, version } = req.body;

        if (!title || !body) {
            return res.status(400).json({ success: false, message: 'title and body are required' });
        }
        if (type === 'BIRTHDAY_WISHES') {
            return res.status(400).json({ success: false, message: 'Birthday Wishes are sent automatically and cannot be created here.' });
        }

        // Only one message can be active at a time — activating this one
        // (or explicitly requesting isActive: true) retires whatever else
        // was active, same "newest wins" rule updateMessage enforces.
        if (isActive) {
            await prisma.appMessage.updateMany({ where: { isActive: true }, data: { isActive: false } });
        }

        const message = await prisma.appMessage.create({
            data: {
                title,
                body,
                type: type || 'ANNOUNCEMENT',
                imageUrl: imageUrl || null,
                targetCityId: targetCityId || null,
                startsAt: startsAt ? new Date(startsAt) : null,
                endsAt: endsAt ? new Date(endsAt) : null,
                isActive: !!isActive,
                requiresAgreement: !!requiresAgreement,
                version: version || '1',
            },
        });

        res.status(201).json({ success: true, data: message });
    } catch (error) {
        next(error);
    }
};

// PUT /api/app-messages/:id - Admin only: update a message. Changing
// `version` on a requiresAgreement message is what makes everyone's prior
// AppMessageDismissal stop counting (see schema.prisma comment) — it's not
// auto-bumped here, the admin sets it explicitly so a typo fix doesn't
// force a re-agree.
const updateMessage = async (req, res, next) => {
    try {
        const { title, body, type, imageUrl, targetCityId, startsAt, endsAt, isActive, requiresAgreement, version } = req.body;

        const existing = await prisma.appMessage.findUnique({ where: { id: req.params.id } });
        if (!existing) {
            return res.status(404).json({ success: false, message: 'Message not found' });
        }
        if (type === 'BIRTHDAY_WISHES') {
            return res.status(400).json({ success: false, message: 'Birthday Wishes are sent automatically and cannot be edited here.' });
        }

        if (isActive === true) {
            await prisma.appMessage.updateMany({
                where: { isActive: true, id: { not: req.params.id } },
                data: { isActive: false },
            });
        }

        const updated = await prisma.appMessage.update({
            where: { id: req.params.id },
            data: {
                ...(title !== undefined && { title }),
                ...(body !== undefined && { body }),
                ...(type !== undefined && { type }),
                ...(imageUrl !== undefined && { imageUrl: imageUrl || null }),
                ...(targetCityId !== undefined && { targetCityId: targetCityId || null }),
                ...(startsAt !== undefined && { startsAt: startsAt ? new Date(startsAt) : null }),
                ...(endsAt !== undefined && { endsAt: endsAt ? new Date(endsAt) : null }),
                ...(isActive !== undefined && { isActive }),
                ...(requiresAgreement !== undefined && { requiresAgreement }),
                ...(version !== undefined && { version }),
            },
        });

        res.json({ success: true, data: updated });
    } catch (error) {
        next(error);
    }
};

// DELETE /api/app-messages/:id - Admin only: delete a message
const deleteMessage = async (req, res, next) => {
    try {
        const existing = await prisma.appMessage.findUnique({ where: { id: req.params.id } });
        if (!existing) {
            return res.status(404).json({ success: false, message: 'Message not found' });
        }
        await prisma.appMessage.delete({ where: { id: req.params.id } });
        res.json({ success: true, message: 'Message deleted successfully' });
    } catch (error) {
        next(error);
    }
};

module.exports = {
    getActiveMessage,
    dismissMessage,
    acknowledgeMessage,
    getAllMessages,
    getMessageEngagement,
    createMessage,
    updateMessage,
    deleteMessage,
};
