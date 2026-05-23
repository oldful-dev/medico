// ──────────────────────────────────────────────
//  Meetup Controller — Local Meetup Management
// ──────────────────────────────────────────────

const prisma = require('../config/database');
const { sendResponse } = require('../utils/helpers');
const { logger } = require('../config/logger');
const crypto = require('crypto');

// ─── Helpers ────────────────────────────────────────────────────
function generateBookingCode() {
    return 'MEET-' + crypto.randomBytes(4).toString('hex').toUpperCase();
}

// ─── Public: List active meetups ────────────────────────────────
// GET /api/meetups
const getMeetups = async (req, res, next) => {
    try {
        const { city, pinCode, upcoming } = req.query;
        const where = { isActive: true };
        if (city) where.city = { contains: city, mode: 'insensitive' };
        if (pinCode) where.pinCode = pinCode;
        if (upcoming === 'true') where.eventDate = { gte: new Date() };

        const meetups = await prisma.meetup.findMany({
            where,
            orderBy: [{ isFeatured: 'desc' }, { eventDate: 'asc' }],
            include: {
                _count: { select: { registrations: { where: { status: { not: 'CANCELLED' } } } } },
            },
        });

        const result = meetups.map(m => ({
            ...m,
            registeredCount: m._count.registrations,
            availableSeats: Math.max(0, m.capacity - m._count.registrations),
            _count: undefined,
        }));

        sendResponse(res, 200, result);
    } catch (error) {
        logger.error('getMeetups error:', error.message);
        next(error);
    }
};

// ─── Public: Get single meetup ──────────────────────────────────
// GET /api/meetups/:id
const getMeetupById = async (req, res, next) => {
    try {
        const { id } = req.params;
        const meetup = await prisma.meetup.findUnique({
            where: { id },
            include: {
                _count: { select: { registrations: { where: { status: { not: 'CANCELLED' } } } } },
            },
        });
        if (!meetup) return sendResponse(res, 404, null, 'Meetup not found');

        sendResponse(res, 200, {
            ...meetup,
            registeredCount: meetup._count.registrations,
            availableSeats: Math.max(0, meetup.capacity - meetup._count.registrations),
            _count: undefined,
        });
    } catch (error) {
        logger.error('getMeetupById error:', error.message);
        next(error);
    }
};

// ─── User: Register & pay for meetup ────────────────────────────
// POST /api/meetups/:id/register
const registerForMeetup = async (req, res, next) => {
    try {
        const { id: meetupId } = req.params;
        const userId = req.user.id;
        const {
            fullName, mobile, age, gender,
            assistanceJson, specialNotes,
            pickupEnabled, pickupAddress, pickupLandmark,
            pickupContact, preferredPickupTime,
        } = req.body;

        // Validate required fields
        if (!fullName || !mobile || !age || !gender) {
            return sendResponse(res, 400, null, 'fullName, mobile, age, and gender are required');
        }

        const meetup = await prisma.meetup.findUnique({ where: { id: meetupId } });
        if (!meetup) return sendResponse(res, 404, null, 'Meetup not found');
        if (!meetup.isActive) return sendResponse(res, 400, null, 'This meetup is no longer active');

        // Check capacity
        const regCount = await prisma.meetupRegistration.count({
            where: { meetupId, status: { not: 'CANCELLED' } },
        });
        if (regCount >= meetup.capacity) {
            return sendResponse(res, 400, null, 'This meetup is fully booked');
        }

        // Prevent duplicate registration
        const existing = await prisma.meetupRegistration.findFirst({
            where: { meetupId, userId, status: { not: 'CANCELLED' } },
        });
        if (existing) {
            return sendResponse(res, 409, null, 'You have already registered for this meetup');
        }

        const registration = await prisma.meetupRegistration.create({
            data: {
                meetupId,
                userId,
                bookingCode: generateBookingCode(),
                fullName,
                mobile,
                age: parseInt(age),
                gender,
                assistanceJson: assistanceJson || null,
                specialNotes: specialNotes || null,
                pickupEnabled: pickupEnabled === true || pickupEnabled === 'true',
                pickupAddress: pickupAddress || null,
                pickupLandmark: pickupLandmark || null,
                pickupContact: pickupContact || null,
                preferredPickupTime: preferredPickupTime || null,
                amountPaid: meetup.serviceCharge,
                status: 'CONFIRMED',
                paymentStatus: 'PAID',
            },
            include: { meetup: true },
        });

        sendResponse(res, 201, registration, 'Registration confirmed');
    } catch (error) {
        logger.error('registerForMeetup error:', error.message);
        next(error);
    }
};

// ─── User: My meetup registrations ──────────────────────────────
// GET /api/meetups/my-registrations
const getMyRegistrations = async (req, res, next) => {
    try {
        const userId = req.user.id;
        const registrations = await prisma.meetupRegistration.findMany({
            where: { userId },
            include: { meetup: true },
            orderBy: { createdAt: 'desc' },
        });
        sendResponse(res, 200, registrations);
    } catch (error) {
        logger.error('getMyRegistrations error:', error.message);
        next(error);
    }
};

// ─── User: Cancel registration ───────────────────────────────────
// POST /api/meetups/registrations/:regId/cancel
const cancelRegistration = async (req, res, next) => {
    try {
        const { regId } = req.params;
        const userId = req.user.id;

        const reg = await prisma.meetupRegistration.findUnique({ where: { id: regId } });
        if (!reg) return sendResponse(res, 404, null, 'Registration not found');
        if (reg.userId !== userId) return sendResponse(res, 403, null, 'Forbidden');
        if (reg.status === 'CANCELLED') return sendResponse(res, 400, null, 'Already cancelled');

        const updated = await prisma.meetupRegistration.update({
            where: { id: regId },
            data: { status: 'CANCELLED' },
        });
        sendResponse(res, 200, updated, 'Registration cancelled');
    } catch (error) {
        logger.error('cancelRegistration error:', error.message);
        next(error);
    }
};

// ─── Admin: Create meetup ────────────────────────────────────────
// POST /api/meetups/admin
const createMeetup = async (req, res, next) => {
    try {
        const {
            title, description, venue, venueAddress, city, pinCode,
            eventDate, startTime, endTime, capacity, serviceCharge,
            isFeatured, organizerName, organizerContact,
            includedItems, extraCharges, imageUrl,
        } = req.body;

        if (!title || !venue || !city || !eventDate || !startTime) {
            return sendResponse(res, 400, null, 'title, venue, city, eventDate, and startTime are required');
        }

        const meetup = await prisma.meetup.create({
            data: {
                title,
                description,
                venue,
                venueAddress,
                city,
                pinCode,
                eventDate: new Date(eventDate),
                startTime,
                endTime,
                capacity: capacity ? parseInt(capacity) : 50,
                serviceCharge: serviceCharge ? parseFloat(serviceCharge) : 299,
                isFeatured: !!isFeatured,
                organizerName,
                organizerContact,
                includedItems: includedItems || [],
                extraCharges: extraCharges || [],
                imageUrl,
            },
        });
        sendResponse(res, 201, meetup, 'Meetup created');
    } catch (error) {
        logger.error('createMeetup error:', error.message);
        next(error);
    }
};

// ─── Admin: Update meetup ────────────────────────────────────────
// PUT /api/meetups/admin/:id
const updateMeetup = async (req, res, next) => {
    try {
        const { id } = req.params;
        const data = { ...req.body };
        if (data.eventDate) data.eventDate = new Date(data.eventDate);
        if (data.capacity) data.capacity = parseInt(data.capacity);
        if (data.serviceCharge) data.serviceCharge = parseFloat(data.serviceCharge);

        const meetup = await prisma.meetup.update({ where: { id }, data });
        sendResponse(res, 200, meetup, 'Meetup updated');
    } catch (error) {
        logger.error('updateMeetup error:', error.message);
        next(error);
    }
};

// ─── Admin: Delete meetup ────────────────────────────────────────
// DELETE /api/meetups/admin/:id
const deleteMeetup = async (req, res, next) => {
    try {
        const { id } = req.params;
        await prisma.meetup.update({ where: { id }, data: { isActive: false } });
        sendResponse(res, 200, null, 'Meetup deactivated');
    } catch (error) {
        logger.error('deleteMeetup error:', error.message);
        next(error);
    }
};

// ─── Admin: List all registrations for a meetup ──────────────────
// GET /api/meetups/admin/:id/registrations
const getMeetupRegistrations = async (req, res, next) => {
    try {
        const { id } = req.params;
        const registrations = await prisma.meetupRegistration.findMany({
            where: { meetupId: id },
            orderBy: { createdAt: 'asc' },
        });
        sendResponse(res, 200, registrations);
    } catch (error) {
        logger.error('getMeetupRegistrations error:', error.message);
        next(error);
    }
};

// ─── Admin: Update registration status ───────────────────────────
// PUT /api/meetups/admin/registrations/:regId
const updateRegistrationStatus = async (req, res, next) => {
    try {
        const { regId } = req.params;
        const { status } = req.body;
        if (!['CONFIRMED', 'PENDING', 'ATTENDED', 'CANCELLED'].includes(status)) {
            return sendResponse(res, 400, null, 'Invalid status');
        }
        const reg = await prisma.meetupRegistration.update({
            where: { id: regId },
            data: { status },
        });
        sendResponse(res, 200, reg, 'Registration status updated');
    } catch (error) {
        logger.error('updateRegistrationStatus error:', error.message);
        next(error);
    }
};

module.exports = {
    getMeetups,
    getMeetupById,
    registerForMeetup,
    getMyRegistrations,
    cancelRegistration,
    createMeetup,
    updateMeetup,
    deleteMeetup,
    getMeetupRegistrations,
    updateRegistrationStatus,
};
