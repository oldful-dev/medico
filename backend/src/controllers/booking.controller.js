// ──────────────────────────────────────────────
//  Booking Management Controller
// ──────────────────────────────────────────────

const prisma = require('../config/database');
const { sendResponse, sendPaginatedResponse, paginate, generateBookingCode } = require('../utils/helpers');
const { sendPushToUser } = require('../utils/pushNotification.service');
const { emitToAdmins } = require('../services/socket.service');

// GET /api/bookings
const getBookings = async (req, res, next) => {
    try {
        const { page, limit, skip } = paginate(req.query);
        const { status, cityId, serviceId, caregiverId, userId, search, dateFrom, dateTo } = req.query;

        const where = {};
        if (req.cityFilter) {
            where.cityId = req.cityFilter;
        } else if (cityId) {
            where.cityId = cityId;
        }
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
            if (dateFrom) where.scheduledDate.gte = new Date(dateFrom.includes('T') ? dateFrom : `${dateFrom}T00:00:00.000+05:30`);
            if (dateTo) where.scheduledDate.lte = new Date(dateTo.includes('T') ? dateTo : `${dateTo}T23:59:59.999+05:30`);
        }

        const [bookings, total] = await Promise.all([
            prisma.booking.findMany({
                where,
                skip,
                take: limit,
                include: {
                    user: { select: { id: true, name: true, uniqueUserId: true, phone: true } },
                    service: { select: { name: true, slug: true, icon: true, pricingText: true } },
                    city: { select: { name: true } },
                    caregiver: { select: { id: true, name: true, phone: true } },
                    payments: true,
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
        const {
            userId, serviceId, cityId,
            scheduledDate, scheduledTime, addressLine, latitude, longitude,
            symptoms, doctorType, staffType, shiftDuration, startDate, endDate, requirements,
            pickupAddress, dropAddress, vehicleType,
            amount, formDataJson, paymentMethod
        } = req.body;

        const finalUserId = userId || (req.user && req.user.id);
        if (!finalUserId) return res.status(400).json({ success: false, message: 'User ID is required' });

        // Find user to get their cityId if not provided
        const userData = await prisma.user.findUnique({ where: { id: finalUserId }, select: { cityId: true, name: true } });
        const finalCityId = cityId || (userData && userData.cityId);

        if (!finalCityId) return res.status(400).json({ success: false, message: 'City ID is required' });

        // Find service by ID (UUID) or Slug
        let service = await prisma.service.findFirst({
            where: {
                OR: [
                    { id: serviceId },
                    { slug: serviceId }
                ]
            }
        });

        if (!service) return res.status(404).json({ success: false, message: 'Service not found' });
        const finalServiceId = service.id;

        // ─── Security: Server-Side Price Floor Enforcement ─────────────────────
        // Prevent amount manipulation. Use DB basePrice as the authority.
        // Skip validation for BLOOD_TEST (dynamic pricing from Redcliffe Labs).
        // Other services: Only validate if basePrice is explicitly set (> 0).
        const serverBasePrice = service.basePrice || 0;
        const clientAmount = parseFloat(amount) || 0;
        const isBloodTest = service.slug === 'blood-test';

        if (!isBloodTest && serverBasePrice > 0 && clientAmount > 0 && clientAmount < serverBasePrice * 0.8) {
            return res.status(400).json({
                success: false,
                message: `Invalid booking amount. Minimum: ₹${(serverBasePrice * 0.8).toFixed(0)}. Please refresh and try again.`
            });
        }
        const safeAmount = clientAmount;

        // Note: BLOOD_TEST bookings are handled here with dynamic Redcliffe pricing.
        // All other service types use standard booking flow.

        // Retry up to 3 times on bookingCode collision
        let booking;
        for (let attempt = 0; attempt < 3; attempt++) {
            try {
                const bookingCode = await generateBookingCode();

                // ─── COD Restriction: Prevent multiple active COD bookings ───────
                if (paymentMethod === 'CASH') {
                    const activeCODBookings = await prisma.booking.count({
                        where: {
                            userId: finalUserId,
                            // Real operational bookings that haven't been completed/cancelled/paid
                            status: { in: ['PENDING', 'CONFIRMED', 'ASSIGNED', 'IN_PROGRESS'] },
                            paymentStatus: { in: ['PENDING', 'INITIATED'] }
                        }
                    });

                    // Note: if user already has 2 or more active COD bookings, restrict them.
                    if (activeCODBookings >= 2) {
                        return res.status(403).json({
                            success: false,
                            message: 'You have too many active cash-on-delivery bookings. Please complete your existing ones first.'
                        });
                    }
                }

                // ─── Status logic ─────────────────────────────────────────
                // COD / free services → CONFIRMED + paymentStatus=PENDING
                // Prepaid (UPI/CARD)  → PAYMENT_PENDING (awaiting verify)
                const isCOD = paymentMethod === 'CASH' || paymentMethod === 'cash' || !safeAmount || safeAmount === 0;

                booking = await prisma.booking.create({
                    data: {
                        bookingCode,
                        userId: finalUserId,
                        serviceId: finalServiceId,
                        cityId: finalCityId,
                        scheduledDate: scheduledDate.includes('T')
                            ? new Date(scheduledDate)
                            : new Date(`${scheduledDate}T12:00:00.000Z`),
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
                        amount: safeAmount,
                        formDataJson: formDataJson || null,
                        status: isCOD ? 'CONFIRMED' : 'PAYMENT_PENDING',
                        paymentStatus: isCOD ? 'PENDING' : 'INITIATED',
                        // Only start SLA clock for real bookings
                        slaDeadline: isCOD ? new Date(Date.now() + 4 * 60 * 60 * 1000) : null,
                    },
                    include: {
                        user: { select: { id: true, name: true, phone: true } },
                        service: { select: { name: true, slug: true, icon: true } },
                    },
                });
                // Create CASH payment record for COD bookings so admin can track & mark collected
                if (isCOD && safeAmount > 0) {
                    await prisma.payment.create({
                        data: {
                            userId: finalUserId,
                            bookingId: booking.id,
                            amount: safeAmount,
                            status: 'INITIATED',
                            paymentMethod: 'CASH',
                        },
                    });
                }

                // 🟢 REAL-TIME: Notify Admins via Socket
                emitToAdmins('new_booking', {
                    id: booking.id,
                    type: 'BOOKING',
                    title: `New: ${booking.service?.name} by ${booking.user?.name}`,
                    time: booking.createdAt,
                    href: '/bookings'
                });

                break; // success
            } catch (err) {
                const isUniqueViolation = err.code === 'P2002' && err.meta?.target?.includes('bookingCode');
                if (!isUniqueViolation || attempt === 2) throw err;
            }
        }

        const bookingCode = booking.bookingCode;

        // Send push notification for booking confirmation
        const shouldNotify = (paymentMethod === 'cash') || (safeAmount === 0);

        if (shouldNotify) {
            await sendPushToUser(finalUserId, {
                title: 'Booking Confirmed',
                body: `Your ${booking.service.name} booking (${bookingCode}) has been placed successfully.`,
                data: { type: 'booking_created', bookingId: booking.id, bookingCode },
            });

            // Send DLT SMS Booking Confirmation
            if (booking.user?.phone) {
                const { sendBookingConfirmation } = require('../utils/notifications');
                await sendBookingConfirmation({
                    user: booking.user,
                    bookingCode,
                    booking: { serviceName: booking.service?.name }
                });
            }
        } else {
            console.log(`[Booking] Deferring notifications for booking ${bookingCode} (Waiting for payment)`);
        }

        // Emit real-time event to admins
        emitToAdmins('new_booking', {
            id: booking.id,
            bookingCode,
            serviceType: booking.service?.name,
            userName: booking.user?.name,
            status: booking.status,
            scheduledDate: booking.scheduledDate,
            createdAt: booking.createdAt
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

        // Emit real-time event to admins
        emitToAdmins('booking_assigned', {
            bookingId: booking.id,
            caregiverName: booking.caregiver.name
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
            include: { user: { select: { name: true } } }
        });

        // Emit real-time event to admins
        emitToAdmins('booking_status_changed', {
            bookingId: booking.id,
            status: booking.status,
            userName: booking.user?.name
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

        emitToAdmins('booking_status_changed', {
            bookingId: booking.id,
            status: booking.status,
            userName: booking.user?.name
        });

        sendResponse(res, 200, booking, 'Booking status updated');
    } catch (error) {
        next(error);
    }
};

// PUT /api/bookings/:id/payment-status
const updatePaymentStatus = async (req, res, next) => {
    try {
        const { paymentStatus } = req.body;
        const validStatuses = ['PENDING', 'INITIATED', 'SUCCESS', 'FAILED', 'REFUNDED'];
        if (!validStatuses.includes(paymentStatus)) {
            return res.status(400).json({ success: false, message: 'Invalid payment status' });
        }

        // Always update the booking's paymentStatus field
        const booking = await prisma.booking.update({
            where: { id: req.params.id },
            data: { paymentStatus },
        });

        // Also update payment record if one exists
        const payment = await prisma.payment.findFirst({
            where: { bookingId: req.params.id },
            orderBy: { createdAt: 'desc' },
        });

        if (payment) {
            await prisma.payment.update({
                where: { id: payment.id },
                data: { status: paymentStatus },
            });
        }

        emitToAdmins('booking_payment_updated', {
            bookingId: req.params.id,
            paymentStatus,
            bookingStatus: null,
        });

        sendResponse(res, 200, booking, 'Payment status updated');
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
                    service: { select: { name: true, slug: true, icon: true, pricingText: true } },
                    payments: true,
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

        if (booking.status === 'CANCELLED') {
            return sendResponse(res, 200, booking, 'Booking is already cancelled');
        }

        if (booking.status === 'COMPLETED') {
            return res.status(400).json({ success: false, message: 'Cannot cancel a completed booking' });
        }

        const updated = await prisma.booking.update({
            where: { id: req.params.id },
            data: { status: 'CANCELLED' },
        });

        // 🛡️ If there was a successful payment, mark it for refund
        await prisma.payment.updateMany({
            where: { bookingId: req.params.id, status: 'SUCCESS' },
            data: { status: 'REFUND_INITIATED' }
        });

        sendResponse(res, 200, updated, 'Booking cancelled');
    } catch (error) {
        next(error);
    }
};

const getMyBookingById = async (req, res, next) => {
    try {
        const booking = await prisma.booking.findUnique({
            where: { id: req.params.id },
            include: {
                service: { select: { name: true, slug: true, icon: true } },
                caregiver: { select: { name: true, phone: true, profileImageUrl: true } },
                city: { select: { name: true } },
                payments: {
                    include: { invoice: true }
                },
            },
        });
        if (!booking) return res.status(404).json({ success: false, message: 'Booking not found' });
        if (booking.userId !== req.user.id) return res.status(403).json({ success: false, message: 'Not your booking' });
        sendResponse(res, 200, booking);
    } catch (error) {
        next(error);
    }
};

const { generateInvoicePDF } = require('../utils/pdfGenerator');

// GET /api/bookings/:id/invoice  (App user — download PDF)
const downloadInvoice = async (req, res, next) => {
    try {
        const booking = await prisma.booking.findUnique({
            where: { id: req.params.id },
            include: {
                user: { select: { name: true, phone: true } },
                service: { select: { name: true } },
                payments: {
                    where: { status: 'SUCCESS' },
                    include: { invoice: true },
                },
            },
        });

        if (!booking) return res.status(404).json({ success: false, message: 'Booking not found' });
        if (booking.userId !== req.user.id) return res.status(403).json({ success: false, message: 'Not authorized' });

        const payment = booking.payments[0];
        if (!payment || !payment.invoice) {
            return res.status(404).json({ success: false, message: 'Invoice not found for this booking' });
        }

        const invoiceData = {
            ...payment.invoice,
            billingName: booking.user.name,
            billingAddress: booking.addressLine || 'N/A',
            description: `${booking.service.name} (${booking.bookingCode})`,
        };

        const pdfBuffer = await generateInvoicePDF(invoiceData);

        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename=Invoice_${booking.bookingCode}.pdf`);
        res.send(pdfBuffer);
    } catch (error) {
        next(error);
    }
};

// PUT /api/bookings/:id/service-person
const updateServicePerson = async (req, res, next) => {
    try {
        const { servicePersonName, servicePersonPhone, servicePersonNotes } = req.body;
        const booking = await prisma.booking.update({
            where: { id: req.params.id },
            data: {
                servicePersonName: servicePersonName || null,
                servicePersonPhone: servicePersonPhone || null,
                servicePersonNotes: servicePersonNotes || null,
            },
            include: {
                user: { select: { id: true, name: true, uniqueUserId: true, phone: true, email: true } },
                service: true,
                city: true,
                caregiver: true,
                payments: true,
            },
        });
        emitToAdmins('booking_updated', booking);
        sendResponse(res, 200, booking, 'Service person details updated');
    } catch (error) {
        next(error);
    }
};

module.exports = {
    getBookings, getBookingById, createBooking,
    assignCaregiver, reassignCaregiver, updateBookingStatus, updatePaymentStatus, escalateBooking,
    getMyBookings, getMyBookingById, cancelBooking, downloadInvoice, updateServicePerson,
};

