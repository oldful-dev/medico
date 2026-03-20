// ──────────────────────────────────────────────
//  Booking Management Controller
// ──────────────────────────────────────────────

const prisma = require('../config/database');
const { sendResponse, sendPaginatedResponse, paginate, generateBookingCode } = require('../utils/helpers');
const { sendPushToUser } = require('../utils/pushNotification.service');

// GET /api/bookings
const getBookings = async (req, res, next) => {
    try {
        const { page, limit, skip } = paginate(req.query);
        const { status, cityId, serviceId, caregiverId, userId, search, dateFrom, dateTo } = req.query;

        const where = {};
        if (req.cityFilter) where.cityId = req.cityFilter;
        if (status) where.status = status;
        if (cityId) where.cityId = cityId;
        if (serviceId) where.serviceId = serviceId;
        if (caregiverId) where.caregiverId = caregiverId;
        if (userId) where.userId = userId;
        if (search) {
            where.OR = [
                { bookingCode: { contains: search, mode: 'insensitive' } },
                { user: { name: { contains: search, mode: 'insensitive' } } },
            ];
        }
        if (dateFrom || dateTo) {
            where.scheduledDate = {};
            if (dateFrom) where.scheduledDate.gte = new Date(dateFrom);
            if (dateTo) where.scheduledDate.lte = new Date(dateTo);
        }

        const [bookings, total] = await Promise.all([
            prisma.booking.findMany({
                where,
                skip,
                take: limit,
                include: {
                    user: { select: { id: true, name: true, uniqueUserId: true, phone: true } },
                    service: { select: { id: true, name: true, icon: true } },
                    city: { select: { name: true } },
                    caregiver: { select: { id: true, name: true, phone: true } },
                },
                orderBy: { createdAt: 'desc' },
            }),
            prisma.booking.count({ where }),
        ]);

        sendPaginatedResponse(res, bookings, total, page, limit);
    } catch (error) {
        next(error);
    }
};

// GET /api/bookings/:id
const getBookingById = async (req, res, next) => {
    try {
        const booking = await prisma.booking.findUnique({
            where: { id: req.params.id },
            include: {
                user: { select: { id: true, name: true, uniqueUserId: true, phone: true, email: true } },
                service: true,
                city: true,
                caregiver: true,
                payments: true,
            },
        });
        if (!booking) return res.status(404).json({ success: false, message: 'Booking not found' });
        sendResponse(res, 200, booking);
    } catch (error) {
        next(error);
    }
};

// POST /api/bookings
const createBooking = async (req, res, next) => {
    try {
        const bookingCode = await generateBookingCode();
        const {
            userId, serviceId, cityId,
            scheduledDate, scheduledTime, addressLine, latitude, longitude,
            symptoms, doctorType, staffType, shiftDuration, startDate, endDate, requirements,
            pickupAddress, dropAddress, vehicleType,
            amount, formDataJson,
        } = req.body;

        const finalUserId = userId || (req.user && req.user.id);
        if (!finalUserId) return res.status(400).json({ success: false, message: 'User ID is required' });

        const service = await prisma.service.findUnique({ where: { id: serviceId } });
        if (!service) return res.status(404).json({ success: false, message: 'Service not found' });

        // Note: BLOOD_TEST bookings go through /api/labs/book (2-step Redcliffe flow).
        // The generic booking controller handles all other service types.

        const booking = await prisma.booking.create({
            data: {
                bookingCode,
                userId: finalUserId,
                serviceId,
                cityId,
                scheduledDate: new Date(scheduledDate),
                scheduledTime,
                addressLine,
                latitude,
                longitude,
                symptoms: symptoms || [],
                doctorType,
                staffType,
                shiftDuration,
                startDate: startDate ? new Date(startDate) : null,
                endDate: endDate ? new Date(endDate) : null,
                requirements: requirements || [],
                pickupAddress,
                dropAddress,
                vehicleType,
                amount: amount || 0,
                formDataJson: formDataJson || null,
                // Auto-set SLA deadline (4 hours from now)
                slaDeadline: new Date(Date.now() + 4 * 60 * 60 * 1000),
            },
            include: {
                user: { select: { name: true, phone: true } },
                service: { select: { name: true, slug: true, icon: true } },
            },
        });

        // Send push notification for booking confirmation
        await sendPushToUser(finalUserId, {
            title: 'Booking Confirmed',
            body: `Your ${booking.service.name} booking (${bookingCode}) has been placed.`,
            data: { type: 'booking_created', bookingId: booking.id, bookingCode },
        });

        sendResponse(res, 201, booking, 'Booking created successfully');
    } catch (error) {
        next(error);
    }
};

// PUT /api/bookings/:id/assign
const assignCaregiver = async (req, res, next) => {
    try {
        const { caregiverId } = req.body;
        const booking = await prisma.booking.update({
            where: { id: req.params.id },
            data: { caregiverId, status: 'ASSIGNED' },
            include: { caregiver: { select: { name: true } } },
        });

        // Notify user that a caregiver has been assigned
        await sendPushToUser(booking.userId, {
            title: 'Caregiver Assigned',
            body: `${booking.caregiver.name} has been assigned to your booking.`,
            data: { type: 'caregiver_assigned', bookingId: booking.id },
        });

        sendResponse(res, 200, booking, 'Caregiver assigned');
    } catch (error) {
        next(error);
    }
};

// PUT /api/bookings/:id/reassign
const reassignCaregiver = async (req, res, next) => {
    try {
        const { caregiverId } = req.body;
        const booking = await prisma.booking.update({
            where: { id: req.params.id },
            data: { caregiverId },
        });
        sendResponse(res, 200, booking, 'Caregiver reassigned');
    } catch (error) {
        next(error);
    }
};

// PUT /api/bookings/:id/status
const updateBookingStatus = async (req, res, next) => {
    try {
        const { status, adminNotes } = req.body;
        const data = { status };
        if (adminNotes !== undefined) data.adminNotes = adminNotes;

        if (status === 'SLA_BREACH') data.isSLABreached = true;

        const booking = await prisma.booking.update({
            where: { id: req.params.id },
            data,
        });

        // Notify user of status change via push
        const statusMessages = {
            IN_PROGRESS: 'Your service is now in progress.',
            COMPLETED: 'Your service has been completed. Thank you!',
            CANCELLED: 'Your booking has been cancelled.',
            SLA_BREACH: 'We apologize for the delay. Our team is escalating your booking.',
        };
        if (statusMessages[status]) {
            await sendPushToUser(booking.userId, {
                title: `Booking ${status.replace('_', ' ')}`,
                body: statusMessages[status],
                data: { type: 'booking_status', bookingId: booking.id, status },
            });
        }

        sendResponse(res, 200, booking, 'Booking status updated');
    } catch (error) {
        next(error);
    }
};

// PUT /api/bookings/:id/escalate
const escalateBooking = async (req, res, next) => {
    try {
        const booking = await prisma.booking.update({
            where: { id: req.params.id },
            data: { isEscalated: true },
        });
        sendResponse(res, 200, booking, 'Booking escalated');
    } catch (error) {
        next(error);
    }
};

// GET /api/bookings/history  (App user — own bookings)
const getMyBookings = async (req, res, next) => {
    try {
        const { page, limit, skip } = paginate(req.query);
        const { status, serviceType } = req.query;

        const where = { userId: req.user.id };
        if (status) where.status = status;

        const [bookings, total] = await Promise.all([
            prisma.booking.findMany({
                where,
                skip,
                take: limit,
                include: {
                    service: { select: { name: true, slug: true, icon: true } },
                    caregiver: { select: { name: true, phone: true } },
                },
                orderBy: { createdAt: 'desc' },
            }),
            prisma.booking.count({ where }),
        ]);

        sendPaginatedResponse(res, bookings, total, page, limit);
    } catch (error) {
        next(error);
    }
};

// POST /api/bookings/:id/cancel  (App user)
const cancelBooking = async (req, res, next) => {
    try {
        const booking = await prisma.booking.findUnique({ where: { id: req.params.id } });
        if (!booking) return res.status(404).json({ success: false, message: 'Booking not found' });
        if (booking.userId !== req.user.id) return res.status(403).json({ success: false, message: 'Not your booking' });

        if (['COMPLETED', 'CANCELLED'].includes(booking.status)) {
            return res.status(400).json({ success: false, message: 'Cannot cancel this booking' });
        }

        const updated = await prisma.booking.update({
            where: { id: req.params.id },
            data: { status: 'CANCELLED' },
        });

        sendResponse(res, 200, updated, 'Booking cancelled');
    } catch (error) {
        next(error);
    }
};

// GET /api/bookings/detail/:id  (App user — get own booking by ID)
const getMyBookingById = async (req, res, next) => {
    try {
        const booking = await prisma.booking.findUnique({
            where: { id: req.params.id },
            include: {
                service: { select: { name: true, slug: true, icon: true } },
                caregiver: { select: { name: true, phone: true, profileImageUrl: true } },
                city: { select: { name: true } },
            },
        });
        if (!booking) return res.status(404).json({ success: false, message: 'Booking not found' });
        if (booking.userId !== req.user.id) return res.status(403).json({ success: false, message: 'Not your booking' });
        sendResponse(res, 200, booking);
    } catch (error) {
        next(error);
    }
};

module.exports = {
    getBookings, getBookingById, createBooking,
    assignCaregiver, reassignCaregiver, updateBookingStatus, escalateBooking,
    getMyBookings, getMyBookingById, cancelBooking,
};

