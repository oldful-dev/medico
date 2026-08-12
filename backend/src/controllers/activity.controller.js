// Activity Updates Controller
// Admin: POST /api/activity/lab-orders/:id/assign  — assign staff + create activity update
// Admin: GET  /api/activity/lab-orders/:id          — get updates for a lab order
// User:  GET  /api/activity/my-updates              — get all activity updates for the authenticated user
// Admin: GET  /api/activity/admin/all               — get all activity updates (paginated feed)

const prisma = require('../config/database');
const { emitToUser, getIO } = require('../services/socket.service');

const VALID_EVENT_TYPES = [
    'doctor_assigned',
    'caregiver_assigned',
    'nurse_assigned',
    'appointment_confirmed',
    'sample_collected',
    'out_for_delivery',
    'medicine_delivered',
    'service_rescheduled',
    'payment_confirmed',
    'phlebo_assigned',
    'sample_processing',
    'booking_cancelled',
];

// POST /api/activity/lab-orders/:id/assign
// Body: { eventType, serviceType, staffName, staffId, staffPhone, staffPhotoUrl, eta, statusDetail }
exports.assignStaff = async (req, res) => {
    const { id } = req.params;
    const {
        eventType, serviceType,
        staffName, staffId, staffPhone, staffPhotoUrl,
        eta, statusDetail,
    } = req.body;

    if (!VALID_EVENT_TYPES.includes(eventType)) {
        return res.status(400).json({ success: false, message: `Invalid eventType. Valid: ${VALID_EVENT_TYPES.join(', ')}` });
    }
    if (!staffName || !staffId || !staffPhone) {
        return res.status(400).json({ success: false, message: 'staffName, staffId, and staffPhone are required.' });
    }

    const order = await prisma.labOrder.findUnique({ where: { id } });
    if (!order) return res.status(404).json({ success: false, message: 'Lab order not found.' });

    // Save assigned staff snapshot on the order
    const staffSnapshot = { name: staffName, staffId, phone: staffPhone, photoUrl: staffPhotoUrl || null, eta: eta || null, role: eventType };
    const [updated, activity] = await prisma.$transaction([
        prisma.labOrder.update({
            where: { id },
            data: { assignedStaff: staffSnapshot },
        }),
        prisma.activityUpdate.create({
            data: {
                labOrderId: id,
                eventType,
                serviceType: serviceType || 'General',
                staffName,
                staffId,
                staffPhone,
                staffPhotoUrl: staffPhotoUrl || null,
                eta: eta || null,
                statusDetail: statusDetail || null,
            },
        }),
    ]);

    // Emit real-time update to user via Socket.io
    emitToUser(order.userId, 'activity_update_created', {
        ...activity,
        clientRefId: order.clientRefId,
    });

    return res.json({ success: true, data: { order: updated, activity } });
};

// GET /api/activity/lab-orders/:id
exports.getOrderUpdates = async (req, res) => {
    const { id } = req.params;
    const updates = await prisma.activityUpdate.findMany({
        where: { labOrderId: id },
        orderBy: { createdAt: 'desc' },
    });
    return res.json({ success: true, data: updates });
};

// GET /api/activity/admin/all  (admin — all updates across all orders)
exports.adminGetAllUpdates = async (req, res) => {
    const { eventType, page = 1, limit = 50 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const where = {};
    if (eventType) where.eventType = eventType;

    const [updates, total] = await Promise.all([
        prisma.activityUpdate.findMany({
            where,
            orderBy: { createdAt: 'desc' },
            skip,
            take: parseInt(limit),
            include: {
                labOrder: {
                    select: {
                        id: true,
                        clientRefId: true,
                        status: true,
                        userId: true,
                        patient: true,
                        packages: true,
                        user: { select: { name: true, phone: true } },
                    }
                }
            }
        }),
        prisma.activityUpdate.count({ where }),
    ]);

    return res.json({ success: true, data: updates, meta: { total, page: parseInt(page), limit: parseInt(limit) } });
};

// GET /api/activity/my-updates  (authenticated user)
exports.getMyUpdates = async (req, res) => {
    const userId = req.user.id;

    // Fetch all lab orders for this user, include their activity updates
    const orders = await prisma.labOrder.findMany({
        where: { userId },
        include: {
            activityUpdates: { orderBy: { createdAt: 'desc' } },
        },
        orderBy: { createdAt: 'desc' },
    });

    // Flatten all updates across orders, newest first
    const updates = orders
        .flatMap(o => o.activityUpdates.map(u => ({
            ...u,
            clientRefId: o.clientRefId,
        })))
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    return res.json({ success: true, data: updates });
};

// PUT /api/activity/updates/:id
exports.updateUpdate = async (req, res) => {
    const { id } = req.params;
    const { eventType, serviceType, staffName, staffId, staffPhone, staffPhotoUrl, eta, statusDetail } = req.body;

    try {
        const update = await prisma.activityUpdate.update({
            where: { id },
            include: { labOrder: { select: { userId: true } } },
            data: {
                ...(eventType && { eventType }),
                ...(serviceType && { serviceType }),
                ...(staffName && { staffName }),
                ...(staffId && { staffId }),
                ...(staffPhone && { staffPhone }),
                ...(staffPhotoUrl !== undefined && { staffPhotoUrl: staffPhotoUrl || null }),
                ...(eta !== undefined && { eta: eta || null }),
                ...(statusDetail !== undefined && { statusDetail: statusDetail || null }),
            },
        });

        // Emit real-time update to user via Socket.io
        emitToUser(update.labOrder?.userId, 'activity_update_edited', update);

        return res.json({ success: true, data: update });
    } catch (error) {
        return res.status(404).json({ success: false, message: 'Activity update not found' });
    }
};

// DELETE /api/activity/updates/:id
exports.deleteUpdate = async (req, res) => {
    const { id } = req.params;
    try {
        const deleted = await prisma.activityUpdate.delete({
            where: { id },
            include: { labOrder: { select: { userId: true } } },
        });

        // Emit real-time deletion to user via Socket.io
        emitToUser(deleted.labOrder?.userId, 'activity_update_deleted', id);

        return res.json({ success: true, message: 'Activity update deleted' });
    } catch (error) {
        return res.status(404).json({ success: false, message: 'Activity update not found' });
    }
};
