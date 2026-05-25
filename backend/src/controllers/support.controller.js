// ──────────────────────────────────────────────
//  Support & Ticketing Controller
// ──────────────────────────────────────────────

const prisma = require('../config/database');
const { sendResponse, sendPaginatedResponse, paginate, generateTicketCode } = require('../utils/helpers');
const { emitToAdmins, emitToUser } = require('../services/socket.service');

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

const { sendPushToUser } = require('../utils/notifications');
const emailService = require('../services/email');

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
        await emailService.sendSupportTicketToAdmin({
            ticketCode,
            subject: ticket.subject,
            userName: user?.name || 'Unknown',
            userUniqueId: user?.uniqueUserId || '',
            category: ticket.category,
            priority: ticket.priority,
            description: ticket.description,
        });

        // Push confirmation to user
        if (ticket.userId) {
            await sendPushToUser(ticket.userId, {
                title: 'Ticket Created',
                body: `Your support ticket ${ticketCode} has been submitted. We'll respond within 48 hours.`,
                data: { type: 'ticket_created', ticketId: ticket.id, ticketCode },
            });
        }

        // Emit real-time event to admins
        emitToAdmins('new_ticket', {
            id: ticket.id,
            ticketCode,
            subject: ticket.subject,
            priority: ticket.priority,
            status: ticket.status,
            createdAt: ticket.createdAt
        });

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

        // Emit real-time event to admins
        if (req.body.status) {
            emitToAdmins('ticket_status_changed', {
                ticketId: ticket.id,
                status: ticket.status
            });
        }

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

        // Emit real-time event to admins
        emitToAdmins('ticket_status_changed', {
            ticketId: ticket.id,
            status: 'resolved'
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

        // Emit real-time event to admins about new message
        emitToAdmins('ticket_message_added', {
            ticketId: ticket.id,
            message: message,
            senderName: req.user.type === 'admin' ? (req.user.name || 'Admin') : 'User'
        });

        if (req.user.type === 'user') {
            // Notify Admin if message is from user
            await emailService.sendUserReplyNotifyAdmin({
                ticketCode: ticket.ticketCode,
                message: message.message,
            });
        } else if (req.user.type === 'admin' && ticket.userId) {
            // Emit real-time to user when admin replies
            emitToUser(ticket.userId, 'ticket_message_added', {
                ticketId: ticket.id,
                message,
                senderName: req.user.name || 'Support Team',
            });
            // Also notify via push
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

// POST /api/support/careers
const submitCareers = async (req, res, next) => {
    try {
        const { name, email, phone, role, experience, resumeLink, coverLetter } = req.body;
        
        // 1. Notify Internal Team
        await emailService.sendCareersNotifyAdmin({ name, email, phone, role, experience, resumeLink, coverLetter });

        // 2. Send Confirmation to Candidate
        await emailService.sendCareersApplicantConfirm({ to: email, name, role });

        sendResponse(res, 200, null, 'Application submitted successfully');
    } catch (error) {
        next(error);
    }
};

// POST /api/support/subscribe
const subscribeNewsletter = async (req, res, next) => {
    try {
        const { email } = req.body;
        if (!email) return res.status(400).json({ success: false, message: 'Email is required' });

        // In a real app, you'd save this to a Newsletter table
        // For now, we just send a confirmation email

        await emailService.sendNewsletterConfirm({ to: email });

        // Also notify business team of new sub
        await emailService.sendEmail({
            to: 'business@ayuxacare.com',
            subject: `[New Subscriber] ${email}`,
            html: `<p>New newsletter subscription from: <b>${email}</b></p>`,
        });

        sendResponse(res, 200, null, 'Subscribed successfully');
    } catch (error) {
        next(error);
    }
};

module.exports = { 
    getMyTickets, 
    getTickets, 
    getTicketById, 
    createTicket, 
    updateTicket, 
    resolveTicket, 
    addMessage, 
    handleInboundEmail,
    submitCareers,
    subscribeNewsletter
};
