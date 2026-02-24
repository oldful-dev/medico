// ──────────────────────────────────────────────
//  Booking Management Controller
// ──────────────────────────────────────────────

const prisma = require('../config/database');
const { sendResponse, sendPaginatedResponse, paginate, generateBookingCode } = require('../utils/helpers');

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

        const booking = await prisma.booking.create({
            data: {
                bookingCode,
                userId,
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
                formDataJson,
                // Auto-set SLA deadline (4 hours from now)
                slaDeadline: new Date(Date.now() + 4 * 60 * 60 * 1000),
            },
            include: {
                user: { select: { name: true, phone: true } },
                service: { select: { name: true } },
            },
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
                    service: { select: { name: true, icon: true } },
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

module.exports = {
    getBookings, getBookingById, createBooking,
    assignCaregiver, reassignCaregiver, updateBookingStatus, escalateBooking,
    getMyBookings, cancelBooking,
};
