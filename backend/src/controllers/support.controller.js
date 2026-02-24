// ──────────────────────────────────────────────
//  Support & Ticketing Controller
// ──────────────────────────────────────────────

const prisma = require('../config/database');
const { sendResponse, sendPaginatedResponse, paginate, generateTicketCode } = require('../utils/helpers');

// GET /api/support/tickets
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
        sendResponse(res, 200, ticket);
    } catch (error) {
        next(error);
    }
};

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
        sendResponse(res, 201, message, 'Message sent');
    } catch (error) {
        next(error);
    }
};

module.exports = { getTickets, getTicketById, createTicket, updateTicket, resolveTicket, addMessage };
