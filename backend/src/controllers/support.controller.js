// ──────────────────────────────────────────────
//  Support & Ticketing Controller
// ──────────────────────────────────────────────

const prisma = require('../config/database');
const { sendResponse, sendPaginatedResponse, paginate, generateTicketCode } = require('../utils/helpers');

// GET /api/support/my-tickets  (App user — own tickets only)
const getMyTickets = async (req, res, next) => {
    try {
        const userId = req.user.id;
        const tickets = await prisma.supportTicket.findMany({
            where: { userId },
            include: { _count: { select: { messages: true } } },
            orderBy: { createdAt: 'desc' },
        });
        sendResponse(res, 200, tickets);
    } catch (error) {
        next(error);
    }
};

// GET /api/support/tickets  (Admin only)
const getTickets = async (req, res, next) => {
    try {
        const { page, limit, skip } = paginate(req.query);
        const { status, priority, category, search } = req.query;

        const where = {};
        if (status) where.status = status;
        if (priority) where.priority = priority;
        if (category) where.category = category;
        if (search) {
            where.OR = [
                { ticketCode: { contains: search, mode: 'insensitive' } },
                { subject: { contains: search, mode: 'insensitive' } },
            ];
        }

        const [tickets, total] = await Promise.all([
            prisma.supportTicket.findMany({
                where,
                skip,
                take: limit,
                include: { _count: { select: { messages: true } } },
                orderBy: { createdAt: 'desc' },
            }),
            prisma.supportTicket.count({ where }),
        ]);

        sendPaginatedResponse(res, tickets, total, page, limit);
    } catch (error) {
        next(error);
    }
};

// GET /api/support/tickets/:id
const getTicketById = async (req, res, next) => {
    try {
        const ticket = await prisma.supportTicket.findUnique({
            where: { id: req.params.id },
            include: {
                messages: { orderBy: { createdAt: 'asc' } },
            },
        });
        if (!ticket) return res.status(404).json({ success: false, message: 'Ticket not found' });

        // Users can only view their own tickets; admins can view any
        if (req.user?.type === 'user' && ticket.userId !== req.user.id) {
            return res.status(403).json({ success: false, message: 'Access denied' });
        }

        sendResponse(res, 200, ticket);
    } catch (error) {
        next(error);
    }
};

const { sendEmail, sendPushToUser } = require('../utils/notifications');

// POST /api/support/tickets
const createTicket = async (req, res, next) => {
    try {
        const ticketCode = await generateTicketCode();
        const ticket = await prisma.supportTicket.create({
            data: {
                ticketCode,
                userId: req.body.userId || req.user?.id,
                subject: req.body.subject,
                description: req.body.description,
                category: req.body.category,
                priority: req.body.priority || 'medium',
            },
        });

        // Notify Admin instantly
        const user = await prisma.user.findUnique({ where: { id: ticket.userId } });
        await sendEmail({
            to: process.env.SUPPORT_EMAIL || process.env.ADMIN_EMAIL || 'client@oldful.com',
            subject: `[Support Ticket ${ticketCode}] ${ticket.subject}`,
            html: `
                <h3>New Support Ticket Created</h3>
                <p><strong>Ticket ID:</strong> ${ticketCode}</p>
                <p><strong>User:</strong> ${user?.name} (${user?.uniqueUserId})</p>
                <p><strong>Category:</strong> ${ticket.category}</p>
                <p><strong>Priority:</strong> ${ticket.priority}</p>
                <hr/>
                <p>${ticket.description}</p>
            `,
        });

        // Push confirmation to user
        if (ticket.userId) {
            await sendPushToUser(ticket.userId, {
                title: 'Ticket Created',
                body: `Your support ticket ${ticketCode} has been submitted. We'll respond within 48 hours.`,
                data: { type: 'ticket_created', ticketId: ticket.id, ticketCode },
            });
        }

        sendResponse(res, 201, ticket, 'Ticket created');
    } catch (error) {
        next(error);
    }
};

// PUT /api/support/tickets/:id
const updateTicket = async (req, res, next) => {
    try {
        const ticket = await prisma.supportTicket.update({
            where: { id: req.params.id },
            data: req.body,
        });
        sendResponse(res, 200, ticket, 'Ticket updated');
    } catch (error) {
        next(error);
    }
};

// PUT /api/support/tickets/:id/resolve
const resolveTicket = async (req, res, next) => {
    try {
        const ticket = await prisma.supportTicket.update({
            where: { id: req.params.id },
            data: {
                status: 'resolved',
                resolvedAt: new Date(),
                resolutionNote: req.body.resolutionNote,
            },
        });
        sendResponse(res, 200, ticket, 'Ticket resolved');
    } catch (error) {
        next(error);
    }
};

// POST /api/support/tickets/:id/messages
const addMessage = async (req, res, next) => {
    try {
        const message = await prisma.ticketMessage.create({
            data: {
                ticketId: req.params.id,
                senderId: req.user.id,
                senderType: req.user.type,
                message: req.body.message,
                attachments: req.body.attachments,
            },
        });

        const ticket = await prisma.supportTicket.findUnique({ where: { id: req.params.id } });

        if (req.user.type === 'user') {
            // Notify Admin if message is from user
            await sendEmail({
                to: process.env.ADMIN_EMAIL || 'admin@oldful.com',
                subject: `[Support Msg] ${ticket.ticketCode}: New message from user`,
                html: `
                    <p>New reply for ticket <strong>${ticket.ticketCode}</strong>:</p>
                    <p>"${message.message}"</p>
                `,
            });
        } else if (req.user.type === 'admin' && ticket.userId) {
            // Notify User via push when admin replies
            await sendPushToUser(ticket.userId, {
                title: 'Support Reply',
                body: `New reply on your ticket ${ticket.ticketCode}.`,
                data: { type: 'ticket_reply', ticketId: ticket.id },
            });
        }

        sendResponse(res, 201, message, 'Message sent');
    } catch (error) {
        next(error);
    }
};

/**
 * POST /api/support/webhook/inbound-email
 * Receives inbound email replies from ZeptoMail/email provider.
 * Matches email subject [Support Ticket] TKT-XXXX to a ticket and adds the reply as a message.
 */
const handleInboundEmail = async (req, res, next) => {
    try {
        const { subject, from, body_text, body_html } = req.body;

        // Extract ticket code from subject line: [Support Ticket] TKT-0001: ...
        // or [Support Msg] TKT-0001: ...
        const ticketCodeMatch = subject?.match(/\b(TKT-\d+)\b/);
        if (!ticketCodeMatch) {
            return res.status(200).json({ success: false, message: 'No ticket code found in subject' });
        }

        const ticketCode = ticketCodeMatch[1];
        const ticket = await prisma.supportTicket.findUnique({ where: { ticketCode } });
        if (!ticket) {
            return res.status(200).json({ success: false, message: 'Ticket not found' });
        }

        // Create message from admin email reply
        const messageContent = body_text || body_html || '(empty reply)';
        const message = await prisma.ticketMessage.create({
            data: {
                ticketId: ticket.id,
                senderId: 'email-inbound',
                senderType: 'admin',
                message: messageContent,
            },
        });

        // Notify user via push that there's a new reply
        if (ticket.userId) {
            await sendPushToUser(ticket.userId, {
                title: 'Support Reply',
                body: `New reply on your ticket ${ticketCode}.`,
                data: { type: 'ticket_reply', ticketId: ticket.id },
            });
        }

        res.status(200).json({ success: true, message: 'Email reply synced to ticket', ticketCode });
    } catch (error) {
        next(error);
    }
};

module.exports = { getMyTickets, getTickets, getTicketById, createTicket, updateTicket, resolveTicket, addMessage, handleInboundEmail };
