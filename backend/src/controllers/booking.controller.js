const prisma = require('../config/database');
const { sendResponse, sendPaginatedResponse, paginate, generateBookingCode } = require('../utils/helpers');
const { sendPushToUser } = require('../utils/pushNotification.service');
const { emitToAdmins } = require('../services/socket.service');
const { logger } = require('../config/logger');
const { getNotificationRecipients } = require('../services/companyConfig.service');

// ─── Admin Booking Notification Helper ──────────────────────────────────────
// Sends SMS, WhatsApp, and Email to dynamic admin recipients configured in
// Company Settings → Notifications. Non-fatal: any failure is logged only.
async function notifyBookingAdmin({ booking, eventLabel }) {
    try {
        const recipients = await getNotificationRecipients();
        const { sms, whatsapp, email } = recipients.booking;

        const bookingCode = booking.bookingCode || booking.id;
        const serviceName = booking.service?.name || 'Service';
        const userName    = booking.user?.name    || 'User';
        const status      = booking.status        || 'CREATED';

        // ── SMS ─────────────────────────────────────────────────────────────
        if (sms) {
            try {
                const { sendSMS } = require('../services/sms');
                // Use ORDER_CONFIRMED template (DLT approved): Var1=name, Var2=orderId, Var3=support
                // Pass distinct name to prevent DLT gateway duplicate suppression
                await sendSMS({
                    template: 'ORDER_CONFIRMED',
                    mobile: sms,
                    variables: [`Admin (${eventLabel})`, bookingCode, process.env.SUPPORT_PHONE || '9480198108'],
                });
                logger.info(`[BookingAdmin] SMS sent → ${sms} (${eventLabel} / ${bookingCode})`);
            } catch (smsErr) {
                logger.warn(`[BookingAdmin] SMS failed (non-fatal): ${smsErr.message}`);
            }
        } else {
            logger.debug('[BookingAdmin] No booking SMS recipient configured — skipping');
        }

        // ── WhatsApp ────────────────────────────────────────────────────────
        if (whatsapp) {
            try {
                const wa = require('../services/whatsapp');
                // BOOKING_CONFIRMED template: Var1=name, Var2=orderId
                // Pass 'Admin' to prevent Meta duplicate message suppression
                await wa.sendWhatsApp({
                    template: 'BOOKING_CONFIRMED',
                    mobile: whatsapp,
                    variables: [`Admin (${eventLabel})`, bookingCode],
                });
                logger.info(`[BookingAdmin] WhatsApp sent → ${whatsapp} (${eventLabel} / ${bookingCode})`);
            } catch (waErr) {
                logger.warn(`[BookingAdmin] WhatsApp failed (non-fatal): ${waErr.message}`);
            }
        } else {
            logger.debug('[BookingAdmin] No booking WhatsApp recipient configured — skipping');
        }

        // ── Email ───────────────────────────────────────────────────────────
        if (email) {
            try {
                const emailService = require('../services/email');
                await emailService.sendBookingConfirmation({
                    to: email,
                    name: `Admin (${eventLabel})`,
                    bookingCode,
                    serviceName,
                    scheduledDate: booking.scheduledDate
                        ? new Date(booking.scheduledDate).toLocaleDateString('en-IN')
                        : 'TBD',
                    amount: booking.amount || 0,
                });
                logger.info(`[BookingAdmin] Email sent → ${email} (${eventLabel} / ${bookingCode})`);
            } catch (emailErr) {
                logger.warn(`[BookingAdmin] Email failed (non-fatal): ${emailErr.message}`);
            }
        } else {
            logger.debug('[BookingAdmin] No booking email recipient configured — skipping');
        }
    } catch (err) {
        // Never let admin notification errors affect booking operations
        logger.warn('[BookingAdmin] notifyBookingAdmin failed (non-fatal):', err.message);
    }
}

// ─── Subscription Check ─────────────────────────────────────────
// Returns true if user has an active subscription (covers all services)
async function hasActiveSubscription(userId) {
    const activeSub = await prisma.subscription.findFirst({
        where: {
            userId,
            status: 'ACTIVE',
            expiryDate: { gt: new Date() }, // Not expired
        },
    });
    return !!activeSub;
}

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

                // ─── Subscription Benefit Check (Swiggy One Model) ──────────────────
                // Scenario A: No subscription → Paid Booking (no block)
                // Scenario B: Subscription + quota available → Free Booking (benefit consumed)
                // Scenario C: Subscription + quota exhausted → LIMIT_EXCEEDED prompt → user may override as Paid Booking
                // Scenario D: ZERO_SERVICE_FEE benefit → fee waiver (no quota tracking)
                let chargeAmount = safeAmount;
                let isSubscriptionCovering = false;
                let usedEntitlement = false;
                let benefitCode = null;
                let updatedFormDataJson = formDataJson || {};

                const { getBenefitCodeForService } = require('../config/benefitMapping');
                const { canConsumeBenefit, consumeBenefit } = require('../services/subscriptionBenefit.service');

                benefitCode = getBenefitCodeForService(service.slug);
                if (benefitCode) {
                    if (benefitCode === 'ZERO_SERVICE_FEE') {
                        // Scenario D: Waiver benefit — check if the subscription includes fee waiver
                        const check = await canConsumeBenefit(finalUserId, 'ZERO_SERVICE_FEE');
                        if (check.allowed) {
                            if (typeof updatedFormDataJson !== 'object') updatedFormDataJson = {};
                            updatedFormDataJson.bookingFeeWaived = true;
                            updatedFormDataJson.platformFeeWaived = true;
                            updatedFormDataJson.gstOnFeeWaived = true;
                        }
                        // If no subscription (NO_ACTIVE_SUBSCRIPTION or BENEFIT_NOT_IN_PLAN),
                        // fees apply normally — no blocking.
                    } else {
                        const check = await canConsumeBenefit(finalUserId, benefitCode);
                        if (check.allowed) {
                            // Scenario B: Free entitlement available — cover the booking
                            chargeAmount = 0;
                            isSubscriptionCovering = true;
                            usedEntitlement = true;
                        } else if (check.reason === 'LIMIT_EXCEEDED') {
                            // Scenario C: Quota exhausted
                            if (!req.body.isPaidBooking) {
                                // Let frontend know to show the "Continue as Paid" prompt
                                return res.status(400).json({
                                    success: false,
                                    code: 'LIMIT_EXCEEDED',
                                    message: 'Your free monthly quota for this service has been exhausted.',
                                    hint: 'Pass isPaidBooking=true to proceed as a standard paid booking.',
                                });
                            }
                            // isPaidBooking=true: fall through, proceed as standard paid booking
                        }
                        // Scenario A: NO_ACTIVE_SUBSCRIPTION / BENEFIT_NOT_IN_PLAN
                        // → No action needed — proceed with safeAmount as paid booking.
                    }
                }

                // ─── Status logic ─────────────────────────────────────────
                // COD / free services → CONFIRMED + paymentStatus=PENDING
                // Prepaid (UPI/CARD)  → PAYMENT_PENDING (awaiting verify)
                // Subscription active  → CONFIRMED + paymentStatus=SUCCESS (free booking)
                const isCOD = paymentMethod === 'CASH' || paymentMethod === 'cash' || !chargeAmount || chargeAmount === 0;

                booking = await prisma.booking.create({
                    data: {
                        bookingCode,
                        userId: finalUserId,
                        serviceId: finalServiceId,
                        cityId: finalCityId,
                        scheduledDate: scheduledDate.includes('T')
                            ? new Date(scheduledDate)
                            : new Date(`${scheduledDate}T12:00:00.000Z`),
                        scheduledTime: scheduledTime || (() => {
                            if (scheduledDate && scheduledDate.includes('T')) {
                                try {
                                    const d = new Date(scheduledDate);
                                    // Format time as hh:mm AM/PM in India timezone (where the service runs)
                                    const timeStr = d.toLocaleTimeString('en-US', {
                                        timeZone: 'Asia/Kolkata',
                                        hour: 'numeric',
                                        minute: '2-digit',
                                        hour12: true
                                    });
                                    return timeStr;
                                } catch (e) {
                                    return null;
                                }
                            }
                            return null;
                        })(),
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
                        amount: chargeAmount,
                        formDataJson: updatedFormDataJson,
                        status: isSubscriptionCovering ? 'CONFIRMED' : (isCOD ? 'CONFIRMED' : 'PAYMENT_PENDING'),
                        paymentStatus: isSubscriptionCovering ? 'SUCCESS' : (isCOD ? 'PENDING' : 'INITIATED'),
                        slaDeadline: (isCOD || isSubscriptionCovering) ? new Date(Date.now() + 4 * 60 * 60 * 1000) : null,
                    },
                    include: {
                        user: { select: { id: true, name: true, phone: true } },
                        service: { select: { name: true, slug: true, icon: true } },
                    },
                });

                if (usedEntitlement) {
                    await consumeBenefit(finalUserId, benefitCode, booking.id);
                }
                // Create payment record
                if (chargeAmount > 0 && isCOD) {
                    // CASH: track for admin
                    await prisma.payment.create({
                        data: {
                            userId: finalUserId,
                            bookingId: booking.id,
                            amount: chargeAmount,
                            status: 'INITIATED',
                            paymentMethod: 'CASH',
                        },
                    });
                } else if (isSubscriptionCovering) {
                    // Subscription-covered: audit record
                    await prisma.payment.create({
                        data: {
                            userId: finalUserId,
                            bookingId: booking.id,
                            amount: 0,
                            status: 'SUCCESS',
                            paymentMethod: 'WALLET',
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

            // WhatsApp + SMS for COD/zero-amount bookings (no payment flow to send it)
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

        // ── Notify admin via dynamic recipients (non-fatal, runs after response) ──
        if (booking.status === 'CONFIRMED') {
            setImmediate(() => notifyBookingAdmin({ booking, eventLabel: 'New Booking' }));
        }
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
            include: { caregiver: { select: { id: true, name: true, phone: true, profileImageUrl: true } }, service: { select: { name: true } } },
        });

        // Emit real-time update to user via Socket.io (for activity feed)
        const { emitToUser } = require('../services/socket.service');
        emitToUser(booking.userId, 'activity_update_created', {
            id: `activity_${Date.now()}`,
            bookingId: booking.id,
            eventType: 'caregiver_assigned',
            serviceType: booking.service?.name || 'Service',
            staffName: booking.caregiver.name,
            staffId: booking.caregiver.id,
            staffPhone: booking.caregiver.phone,
            staffPhotoUrl: booking.caregiver.profileImageUrl || null,
            statusDetail: `${booking.caregiver.name} has been assigned to your booking`,
            createdAt: new Date().toISOString(),
        });

        // Notify user that a caregiver has been assigned — push notification
        await sendPushToUser(booking.userId, {
            title: 'Staff Assigned',
            body: `${booking.caregiver.name} has been assigned to your booking.`,
            data: { type: 'caregiver_assigned', bookingId: booking.id },
        });

        // DLT SMS — BUDDY_ASSIGNED (215395) — Var1=user name
        try {
            const user = await prisma.user.findUnique({
                where: { id: booking.userId },
                select: { name: true, phone: true, smsEnabled: true },
            });
            if (user?.phone && user.smsEnabled !== false) {
                const { sendSMS } = require('../services/sms');
                await sendSMS({
                    template: 'BUDDY_ASSIGNED',
                    mobile: user.phone,
                    variables: [user.name],
                    userId: booking.userId,
                });
                logger.info(`[SMS] BUDDY_ASSIGNED sent → ${user.phone}`);
            }
        } catch (smsErr) {
            logger.warn('BUDDY_ASSIGNED SMS failed (non-fatal):', smsErr.message);
        }

        // WhatsApp — SHIFT_ASSIGNED to caregiver via AYUXA_HQ — non-fatal
        if (booking.caregiver?.phone) {
            try {
                const { sendShiftAssigned } = require('../services/whatsapp');
                const scheduledDate = booking.scheduledDate
                    ? new Date(booking.scheduledDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
                    : '-';
                const scheduledTime = booking.scheduledDate
                    ? new Date(booking.scheduledDate).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })
                    : '-';
                const bookingUser = await prisma.user.findUnique({ where: { id: booking.userId }, select: { name: true, uniqueUserId: true } });
                await sendShiftAssigned({
                    phone: booking.caregiver.phone,
                    empName: booking.caregiver.name,
                    clientName: bookingUser?.name || 'Client',
                    clientId: bookingUser?.uniqueUserId || booking.userId,
                    date: scheduledDate,
                    time: scheduledTime,
                });
                logger.info(`[WA] SHIFT_ASSIGNED sent → ${booking.caregiver.phone}`);
            } catch (waErr) {
                logger.warn('SHIFT_ASSIGNED WhatsApp failed (non-fatal):', waErr.message);
            }
        }

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
            include: {
                user: { select: { name: true } },
                caregiver: { select: { name: true, phone: true } },
            }
        });

        // Emit real-time event to admins
        emitToAdmins('booking_status_changed', {
            bookingId: booking.id,
            status: booking.status,
            userName: booking.user?.name
        });

        // Notify user of status change via push + WhatsApp/SMS for key statuses
        const statusMessages = {
            IN_PROGRESS: 'Your service is now in progress.',
            COMPLETED: 'Your service has been completed. Thank you!',
            CANCELLED: 'Your booking has been cancelled.',
            SLA_BREACH: 'We apologize for the delay. Our team is escalating your booking.',
        };

        // WhatsApp + SMS for COMPLETED and CANCELLED (high-importance statuses)
        if (status === 'COMPLETED' || status === 'CANCELLED') {
            try {
                const user = await prisma.user.findUnique({
                    where: { id: booking.userId },
                    select: { name: true, phone: true, smsEnabled: true },
                });
                if (user?.phone) {
                    const { sendOrderCancelled } = require('../services/whatsapp');
                    if (status === 'CANCELLED') {
                        const waSuccess = await sendOrderCancelled({ phone: user.phone, name: user.name, orderId: booking.bookingCode || booking.id, userId: booking.userId })
                            .catch(err => {
                                logger.warn('Order Cancelled WA failed (non-fatal):', err.message);
                                return false;
                            });
                        if (!waSuccess && user.smsEnabled !== false) {
                            const { sendSMS } = require('../services/sms');
                            await sendSMS({ template: 'ORDER_CANCELLED_USER', mobile: user.phone, variables: [user.name, booking.bookingCode || booking.id], userId: booking.userId });
                        }
                    }
                    // COMPLETED: push is sufficient; booking confirmation already sent at creation
                }
            } catch (notifErr) {
                logger.warn(`updateBookingStatus (${status}): notification failed (non-fatal):`, notifErr.message);
            }

            // Notify assigned caregiver of shift cancellation — non-fatal
            if (status === 'CANCELLED' && booking.caregiver?.phone) {
                try {
                    const { sendShiftCancelledWA } = require('../services/whatsapp');
                    const scheduledDate = booking.scheduledDate
                        ? new Date(booking.scheduledDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
                        : 'TBD';
                    const waSuccess = await sendShiftCancelledWA({
                        phone: booking.caregiver.phone,
                        empName: booking.caregiver.name,
                        clientName: booking.user?.name || 'Client',
                        clientId: booking.bookingCode || booking.id,
                        date: scheduledDate,
                    }).catch(err => {
                        logger.warn('Caregiver shift cancelled WA failed (non-fatal):', err.message);
                        return false;
                    });

                    if (!waSuccess) {
                        const { sendSMS } = require('../services/sms');
                        await sendSMS({
                            template: 'SHIFT_CANCELLED_PARTNER',
                            mobile: booking.caregiver.phone,
                            variables: [booking.caregiver.name, booking.user?.name || 'Client', booking.bookingCode || booking.id, scheduledDate],
                        });
                    }
                } catch (caregiverNotifErr) {
                    logger.warn(`updateBookingStatus: caregiver shift notification failed (non-fatal):`, caregiverNotifErr.message);
                }
            }
        }

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

        // ── Notify admin via dynamic recipients for key status changes (non-fatal) ──
        const adminNotifyStatuses = ['ASSIGNED', 'COMPLETED', 'CANCELLED'];
        if (adminNotifyStatuses.includes(status)) {
            setImmediate(() => notifyBookingAdmin({ booking, eventLabel: `Booking ${status}` }));
        }
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
                    service: { select: { name: true, slug: true, icon: true, pricingText: true, serviceType: true } },
                    caregiver: { select: { name: true, phone: true } },
                    payments: { select: { status: true, amount: true }, orderBy: { createdAt: 'desc' }, take: 1 },
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

        // Notify user of cancellation — non-fatal
        try {
            const { sendOrderCancelled } = require('../services/whatsapp');
            const { sendSMS } = require('../services/sms');
            const user = await prisma.user.findUnique({
                where: { id: req.user.id },
                select: { name: true, phone: true, smsEnabled: true, whatsappEnabled: true },
            });
            if (user) {
                const waSuccess = await sendOrderCancelled({ phone: user.phone, name: user.name, orderId: booking.bookingCode || req.params.id, userId: req.user.id })
                    .catch(err => {
                        logger.warn('Cancel Booking WA failed (non-fatal):', err.message);
                        return false;
                    });
                if (!waSuccess && user.smsEnabled !== false) {
                    await sendSMS({ template: 'ORDER_CANCELLED_USER', mobile: user.phone, variables: [user.name, booking.bookingCode || req.params.id], userId: req.user.id });
                }
            }
        } catch (notifErr) {
            logger.warn('cancelBooking: notification failed (non-fatal):', notifErr.message);
        }

        // Notify assigned caregiver of shift cancellation — non-fatal
        if (booking.caregiverId) {
            try {
                const { sendSMS } = require('../services/sms');
                const caregiver = await prisma.caregiver.findUnique({
                    where: { id: booking.caregiverId },
                    select: { name: true, phone: true },
                });
                const bookingUser = await prisma.user.findUnique({
                    where: { id: booking.userId },
                    select: { name: true },
                });
                if (caregiver?.phone) {
                    const scheduledDate = booking.scheduledDate
                        ? new Date(booking.scheduledDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
                        : 'TBD';
                    const { sendShiftCancelledWA } = require('../services/whatsapp');
                    const waSuccess = await sendShiftCancelledWA({
                        phone: caregiver.phone,
                        empName: caregiver.name,
                        clientName: bookingUser?.name || 'Client',
                        clientId: booking.bookingCode || req.params.id,
                        date: scheduledDate,
                    }).catch(err => {
                        logger.warn('Caregiver cancel shift WA failed (non-fatal):', err.message);
                        return false;
                    });

                    if (!waSuccess) {
                        const { sendSMS } = require('../services/sms');
                        await sendSMS({
                            template: 'SHIFT_CANCELLED_PARTNER',
                            mobile: caregiver.phone,
                            variables: [caregiver.name, bookingUser?.name || 'Client', booking.bookingCode || req.params.id, scheduledDate],
                        });
                    }
                }
            } catch (caregiverNotifErr) {
                logger.warn('cancelBooking: caregiver shift notification failed (non-fatal):', caregiverNotifErr.message);
            }
        }

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
        
        // Allow admins to bypass user matching
        const isAdmin = req.user && (req.user.role || req.user.isStaffProfile === true || req.baseUrl.includes('/admin') || req.path.includes('/admin/'));
        if (booking.userId !== req.user.id && !isAdmin) {
            return res.status(403).json({ success: false, message: 'Not authorized' });
        }

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

        console.log('[PDF_DEBUG] Is Buffer:', Buffer.isBuffer(pdfBuffer));
        console.log('[PDF_DEBUG] Length:', pdfBuffer?.length);
        if (pdfBuffer && pdfBuffer.length >= 4) {
            console.log('[PDF_DEBUG] Header:', pdfBuffer.slice(0, 4).toString('utf8'));
        }

        res.set({
            'Content-Type': 'application/pdf',
            'Content-Disposition': `inline; filename=Invoice_${booking.bookingCode}.pdf`,
            'Content-Length': pdfBuffer.length,
        });

        return res.end(pdfBuffer);
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
    notifyBookingAdmin,
};

