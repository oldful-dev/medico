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
            to: process.env.SUPPORT_EMAIL || process.env.ADMIN_EMAIL || 'client@ayuxa.com',
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
            await sendEmail({
                to: process.env.ADMIN_EMAIL || 'admin@ayuxa.com',
                subject: `[Support Msg] ${ticket.ticketCode}: New message from user`,
                html: `
                    <p>New reply for ticket <strong>${ticket.ticketCode}</strong>:</p>
                    <p>"${message.message}"</p>
                `,
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
        await sendEmail({
            to: 'business@ayuxa.com',
            subject: `[Job Application] ${role} - ${name}`,
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; border: 1px solid #eee; padding: 20px; border-radius: 10px;">
                    <h2 style="color: #048357;">New Job Application Received</h2>
                    <p>A new candidate has applied for a position at Ayuxa via the Careers page.</p>
                    
                    <div style="background: #f9f9f9; padding: 15px; border-radius: 8px; margin-bottom: 20px;">
                        <p><strong>Candidate Name:</strong> ${name}</p>
                        <p><strong>Email:</strong> ${email}</p>
                        <p><strong>Phone:</strong> ${phone}</p>
                        <p><strong>Applied Role:</strong> ${role}</p>
                        <p><strong>Experience:</strong> ${experience} years</p>
                    </div>

                    <p><strong>Resume Link:</strong> <a href="${resumeLink}" style="color: #048357;">${resumeLink}</a></p>
                    
                    <div style="margin-top: 20px;">
                        <p><strong>Cover Letter:</strong></p>
                        <blockquote style="border-left: 4px solid #048357; padding-left: 15px; font-style: italic; color: #555;">
                            ${coverLetter}
                        </blockquote>
                    </div>
                </div>
            `,
        });

        // 2. Send Confirmation to Candidate
        await sendEmail({
            to: email,
            subject: `Application Received: ${role} at Ayuxa`,
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #333; line-height: 1.6; border: 1px solid #eee; padding: 30px; border-radius: 20px;">
                    <div style="text-align: center; margin-bottom: 30px;">
                        <h2 style="color: #048357; margin-bottom: 10px;">Application Received!</h2>
                        <p style="font-size: 16px; color: #666;">Hi ${name}, thank you for your interest in joining Ayuxa.</p>
                    </div>
                    
                    <p style="text-align: center;">We've received your application for the <strong>${role}</strong> position. Our talent acquisition team is currently reviewing your profile and will get back to you if your qualifications match our current needs.</p>
                    
                    <div style="background: #f8fbf9; border: 1px solid #e0f2e9; padding: 25px; border-radius: 15px; margin: 25px 0;">
                        <h4 style="margin-top: 0; color: #048357; text-align: center;">What happens next?</h4>
                        <div style="display: block; width: fit-content; margin: 0 auto;">
                            <ol style="margin-bottom: 0; padding-left: 0; list-style-position: inside; font-size: 14px; color: #444;">
                                <li style="margin-bottom: 8px;"><b>Profile Review:</b> Our team reviews applications within 3-5 days.</li>
                                <li style="margin-bottom: 8px;"><b>Initial Screening:</b> Shortlisted candidates get a brief call.</li>
                                <li><b>Interviews:</b> Deep-dive sessions with team leads.</li>
                            </ol>
                        </div>
                    </div>

                    <p style="font-size: 12px; color: #888; text-align: center; margin-top: 30px;">Note: This is an automated confirmation. Please do not reply directly to this email.</p>
                    
                    <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;"/>
                    
                    <div style="text-align: center;">
                        <p style="font-size: 14px; font-weight: bold; color: #048357; margin-bottom: 5px;">Team Ayuxa</p>
                        <p style="font-size: 12px; color: #aaa;">Making Elder Care Better, Together.</p>
                    </div>
                </div>
            `,
        });

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

        await sendEmail({
            to: email,
            subject: 'Welcome to the Ayuxa Journal!',
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #333; line-height: 1.6; border: 1px solid #eee; padding: 40px; border-radius: 24px; text-align: center;">
                    <div style="margin-bottom: 30px;">
                        <h1 style="color: #048357; margin-bottom: 10px; font-size: 28px;">You're In!</h1>
                        <p style="font-size: 16px; color: #666;">Thank you for subscribing to the Ayuxa Journal.</p>
                    </div>
                    
                    <div style="background: #f8fbf9; border: 1px solid #e0f2e9; padding: 30px; border-radius: 20px; margin: 30px 0;">
                        <p style="margin: 0; color: #444; font-size: 15px;">
                            We're excited to share our latest insights, geriatric care tips, 
                            and community stories with you every week. 
                            Our mission is to help every family give their elders the dignity and care they deserve.
                        </p>
                    </div>

                    <p style="font-size: 14px; color: #888; margin-top: 30px;">
                        Stay tuned for our next issue. To ensure our emails reach you, 
                        please add <b>care@ayuxa.com</b> to your contacts.
                    </p>
                    
                    <hr style="border: none; border-top: 1px solid #eee; margin: 40px 0;"/>
                    
                    <div>
                        <p style="font-size: 16px; font-weight: bold; color: #048357; margin-bottom: 5px;">Team Ayuxa</p>
                        <p style="font-size: 12px; color: #aaa;">Digital Health & Elder Care Management</p>
                    </div>
                </div>
            `,
        });

        // Also notify business team of new sub
        await sendEmail({
            to: 'business@ayuxa.com',
            subject: `[New Subscriber] ${email}`,
            html: `<p>New newsletter subscription from: <b>${email}</b></p>`
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
