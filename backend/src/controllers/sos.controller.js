// ──────────────────────────────────────────────
//  SOS Controller
// ──────────────────────────────────────────────

const prisma = require('../config/database');
const { logger } = require('../config/logger');
const { sendEmail, sendPushToUser } = require('../utils/notifications');
const wa = require('../services/whatsapp');
const { sendSMS } = require('../services/sms');
const { reverseGeocode } = require('../utils/geocoding.service');

// City-centre coords used when device GPS is unavailable (emulator / permission denied)
const CITY_COORDS = {
    'bangalore': { lat: 12.9716, lng: 77.5946 },
    'bengaluru': { lat: 12.9716, lng: 77.5946 },
    'mumbai':    { lat: 19.0760, lng: 72.8777 },
    'delhi':     { lat: 28.6139, lng: 77.2090 },
    'hyderabad': { lat: 17.3850, lng: 78.4867 },
    'chennai':   { lat: 13.0827, lng: 80.2707 },
    'pune':      { lat: 18.5204, lng: 73.8567 },
    'kolkata':   { lat: 22.5726, lng: 88.3639 },
};

/**
 * POST /api/sos
 * Handle incoming SOS alert from Mobile App.
 * Notifications are non-fatal — SOS is always saved to DB regardless of notification failures.
 */
const triggerSOS = async (req, res) => {
    const { location } = req.body;
    // authenticateUser middleware loads full user into req.appUser
    const user = req.appUser;

    // 1. Resolve coordinates: GPS → registered address → city centroid
    let resolvedLat = location?.latitude ?? null;
    let resolvedLng = location?.longitude ?? null;
    let locationSource = resolvedLat ? 'gps' : null;

    if (!resolvedLat || !resolvedLng) {
        try {
            const defaultAddr = await prisma.address.findFirst({
                where: { userId: user.id, isDefault: true },
                select: { latitude: true, longitude: true },
            });
            if (defaultAddr?.latitude && defaultAddr?.longitude) {
                resolvedLat = defaultAddr.latitude;
                resolvedLng = defaultAddr.longitude;
                locationSource = 'registered_address';
            }
        } catch (addrErr) {
            logger.warn('SOS address fallback failed (non-fatal):', addrErr.message);
        }
    }

    if (!resolvedLat || !resolvedLng) {
        try {
            const cityRecord = await prisma.city.findUnique({
                where: { id: user.cityId },
                select: { name: true },
            });
            const cityKey = (cityRecord?.name || '').toLowerCase().trim();
            const cityCoords = CITY_COORDS[cityKey];
            if (cityCoords) {
                resolvedLat = cityCoords.lat;
                resolvedLng = cityCoords.lng;
                locationSource = 'city_centroid';
                logger.info(`SOS: using city centroid for ${cityRecord.name}`);
            }
        } catch (cityErr) {
            logger.warn('SOS city fallback failed (non-fatal):', cityErr.message);
        }
    }

    // 2. Reverse geocode — non-fatal
    let addressSnapshot = null;
    if (resolvedLat && resolvedLng) {
        try {
            const geo = await reverseGeocode(resolvedLat, resolvedLng);
            if (geo) addressSnapshot = geo.formattedAddress;
        } catch (geoErr) {
            logger.warn('SOS reverse geocode failed (non-fatal):', geoErr.message);
        }
    }

    // 3. Save SOS record to DB
    let sosAlert;
    try {
        sosAlert = await prisma.sOSAlert.create({
            data: {
                userId: user.id,
                cityId: user.cityId,
                latitude: resolvedLat,
                longitude: resolvedLng,
                addressSnapshot,
                status: 'ACTIVE',
                adminNotified: false,
                familyNotified: false,
            },
            include: { user: { select: { name: true, phone: true, uniqueUserId: true } } }
        });

        // 🟢 REAL-TIME: Notify Admins via Socket
        const { emitToAdmins } = require('../services/socket.service');
        emitToAdmins('new_sos', {
            id: sosAlert.id,
            type: 'SOS',
            title: `Critical: SOS by ${sosAlert.user?.name || 'User'}`,
            time: sosAlert.createdAt,
            href: '/sos'
        });

    } catch (dbErr) {
        logger.error('SOS DB create failed:', dbErr);
        return res.status(500).json({ success: false, message: 'Failed to record SOS alert' });
    }

    // 4. Build location details
    const locationLink = (resolvedLat && resolvedLng)
        ? `https://www.google.com/maps?q=${resolvedLat},${resolvedLng}`
        : 'Location unavailable';
    const addressDisplay = addressSnapshot || (resolvedLat ? `${resolvedLat},${resolvedLng}` : 'Unknown');
    const triggeredAt = new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', hour12: true });

    // Rich details string packed into Var2 for WhatsApp (template has only 2 vars)
    const sosDetails = `Ph: ${user.phone} | ${addressDisplay} | ${locationLink} | ${triggeredAt}`;

    const adminPhone = process.env.ADMIN_EMERGENCY_PHONE || '9999999999';

    // 5. Notify admin via WhatsApp + SMS — non-fatal
    let adminNotified = false;
    try {
        const waSent = await wa.sendSOSAlertOps({
            phone: adminPhone,
            userName: user.name,
            ayuxaId: sosDetails,   // pack all details into Var2
        });
        if (waSent) {
            adminNotified = true;
            logger.info(`[SOS] Admin WhatsApp sent → ${adminPhone}`);
        } else {
            logger.warn(`[SOS] Admin WhatsApp failed → ${adminPhone} (trying SMS fallback)`);
        }
    } catch (err) {
        logger.warn(`[SOS] Admin WhatsApp error (non-fatal): ${err.message}`);
    }

    // Admin SMS fallback (SOS_ADMIN — sender AYUXHO)
    try {
        const smsSent = await sendSMS({
            template: 'SOS_ADMIN',
            mobile: adminPhone,
            variables: [user.name, user.uniqueUserId],
        });
        if (smsSent) {
            adminNotified = true;
            logger.info(`[SOS] Admin SMS sent → ${adminPhone}`);
        } else {
            logger.warn(`[SOS] Admin SMS failed → ${adminPhone}`);
        }
    } catch (err) {
        logger.warn(`[SOS] Admin SMS error (non-fatal): ${err.message}`);
    }

    // 6. Notify admin via email — non-fatal
    try {
        await sendEmail({
            to: process.env.ADMIN_EMAIL || 'admin@ayuxa.com',
            subject: `🚨 EMERGENCY: SOS triggered by ${user.name}`,
            html: `
                <h2 style="color:red">🚨 SOS Alert Triggered</h2>
                <p><strong>Client Name:</strong> ${user.name} (${user.uniqueUserId})</p>
                <p><strong>Mobile:</strong> ${user.phone}</p>
                <p><strong>Address:</strong> ${addressDisplay}</p>
                <p><strong>Live Location:</strong> <a href="${locationLink}">${locationLink}</a></p>
                <p><strong>Date &amp; Time:</strong> ${triggeredAt}</p>
                <p style="color:red;font-weight:bold">Please take immediate action.</p>
            `,
        });
        adminNotified = true;
        logger.info(`[SOS] Admin email sent → ${process.env.ADMIN_EMAIL || 'admin@ayuxa.com'}`);
    } catch (err) {
        logger.warn(`[SOS] Admin email error (non-fatal): ${err.message}`);
    }

    // 7. Notify family contacts via WhatsApp + SMS — non-fatal
    let familyNotified = false;
    try {
        const contacts = await prisma.emergencyContact.findMany({ where: { userId: user.id } });
        logger.info(`[SOS] Notifying ${contacts.length} emergency contact(s)`);

        for (const contact of contacts) {
            // WhatsApp — SOS_ALERT_CLIENT to each emergency contact (via AYUXA)
            try {
                const waSent = await wa.sendSOSAlertClient({
                    phone: contact.phone,
                    userName: user.name,
                    ayuxaId: sosDetails,   // pack location details into Var2
                    userId: user.id,
                });
                if (waSent) {
                    familyNotified = true;
                    logger.info(`[SOS] Family WhatsApp sent → ${contact.phone} (${contact.name})`);
                } else {
                    logger.warn(`[SOS] Family WhatsApp failed → ${contact.phone} (trying SMS)`);
                }
            } catch (err) {
                logger.warn(`[SOS] Family WhatsApp error for ${contact.phone}: ${err.message}`);
            }

            // SMS fallback (SOS_FAMILY — sender AYUXHO)
            try {
                const smsSent = await sendSMS({
                    template: 'SOS_FAMILY',
                    mobile: contact.phone,
                    variables: [contact.name, user.name],
                });
                if (smsSent) {
                    familyNotified = true;
                    logger.info(`[SOS] Family SMS sent → ${contact.phone} (${contact.name})`);
                } else {
                    logger.warn(`[SOS] Family SMS failed → ${contact.phone}`);
                }
            } catch (err) {
                logger.warn(`[SOS] Family SMS error for ${contact.phone}: ${err.message}`);
            }
        }
    } catch (err) {
        logger.warn(`[SOS] Family contacts fetch failed (non-fatal): ${err.message}`);
    }

    // 8. Dispatch SOS to assigned caregiver (if user has active booking with caregiver) — non-fatal
    try {
        const activeBooking = await prisma.booking.findFirst({
            where: {
                userId: user.id,
                status: { in: ['ASSIGNED', 'IN_PROGRESS'] },
                caregiverId: { not: null },
            },
            include: { caregiver: { select: { name: true, phone: true } } },
            orderBy: { createdAt: 'desc' },
        });
        if (activeBooking?.caregiver?.phone) {
            // WhatsApp dispatch via AYUXA_HQ (SOS_DISPATCH)
            try {
                await wa.sendSOSDispatch({
                    phone: activeBooking.caregiver.phone,
                    empName: activeBooking.caregiver.name,
                    clientName: user.name,
                    clientId: user.uniqueUserId || user.id,
                });
                logger.info(`[SOS] Caregiver WhatsApp dispatch sent → ${activeBooking.caregiver.phone} (${activeBooking.caregiver.name})`);
            } catch (waErr) {
                logger.warn('[SOS] Caregiver WhatsApp dispatch failed (non-fatal):', waErr.message);
            }

            // SMS dispatch fallback (SOS_PARTNER — sender AYUXAH)
            await sendSMS({
                template: 'SOS_PARTNER',
                mobile: activeBooking.caregiver.phone,
                variables: [user.uniqueUserId || user.id],
            });
            logger.info(`[SOS] Caregiver dispatch SMS sent → ${activeBooking.caregiver.phone} (${activeBooking.caregiver.name})`);
        }
    } catch (err) {
        logger.warn('[SOS] Caregiver dispatch failed (non-fatal):', err.message);
    }

    // 9. Send push confirmation to user — non-fatal
    try {
        await sendPushToUser(user.id, {
            title: 'SOS Alert Sent',
            body: 'Your emergency alert has been sent to the Ayuxa team and your emergency contacts.',
            data: { type: 'sos_confirmation', sosId: sosAlert.id },
        });
    } catch (err) {
        logger.warn('SOS push to user failed (non-fatal):', err.message);
    }

    // 10. Update notification flags
    try {
        await prisma.sOSAlert.update({
            where: { id: sosAlert.id },
            data: { adminNotified, familyNotified },
        });
    } catch (err) {
        logger.warn('SOS flag update failed (non-fatal):', err.message);
    }

    return res.status(200).json({
        success: true,
        message: 'SOS alert recorded and notifications dispatched',
        data: { sosId: sosAlert.id, adminNotified, familyNotified },
    });
};

/**
 * GET /api/sos
 * ADMIN: Get all SOS alerts with filtering and pagination
 */
const getSOSAlerts = async (req, res) => {
    try {
        const { status, cityId, page = 1, limit = 20 } = req.query;
        const skip = (page - 1) * limit;

        const where = {};
        if (status) where.status = status;
        if (cityId) where.cityId = cityId;

        const alerts = await prisma.sOSAlert.findMany({
            where,
            include: {
                user: { select: { name: true, phone: true, uniqueUserId: true } },
                city: { select: { name: true } },
                responder: { select: { name: true, phone: true } },
            },
            orderBy: { createdAt: 'desc' },
            skip: parseInt(skip),
            take: parseInt(limit),
        });

        const total = await prisma.sOSAlert.count({ where });

        res.json({
            success: true,
            data: { alerts, total, page: parseInt(page), pages: Math.ceil(total / limit) }
        });
    } catch (err) {
        logger.error('Failed to fetch SOS alerts:', err);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
};

/**
 * PUT /api/sos/:id/assign
 * ADMIN: Assign a responder to an SOS alert
 */
const assignResponder = async (req, res) => {
    try {
        const { id } = req.params;
        const { responderId } = req.body;

        const alert = await prisma.sOSAlert.update({
            where: { id },
            data: {
                responderId,
                status: 'RESPONDING',
            },
            include: { responder: true, user: true }
        });

        const { emitToAdmins, emitToUser } = require('../services/socket.service');
        const { sendPushToUser } = require('../utils/notifications');

        // Notify admins of the update
        emitToAdmins('sos_updated', alert);

        // Emit real-time activity update to user's Activity Center
        if (alert.responder && alert.user) {
            // Send real-time update via Socket.io (user sees it immediately)
            emitToUser(alert.userId, 'activity_update_created', {
                id: `sos_${alert.id}_${Date.now()}`,
                eventType: 'caregiver_assigned',
                serviceType: 'SOS Alert',
                staffName: alert.responder.name || 'Emergency Responder',
                staffId: alert.responder.id,
                staffPhone: alert.responder.phone || '',
                staffPhotoUrl: alert.responder.photoUrl || null,
                statusDetail: 'Emergency responder assigned to your SOS alert',
                createdAt: new Date(),
            });

            // Send FCM push notification to user
            try {
                await sendPushToUser(alert.userId, {
                    title: '🚨 Emergency Responder Assigned',
                    body: `${alert.responder.name || 'Responder'} is on the way to help you.`,
                    data: {
                        type: 'sos_responder_assigned',
                        sosAlertId: alert.id,
                    },
                });
            } catch (pushErr) {
                logger.warn('Failed to send FCM push for SOS responder assignment:', pushErr.message);
            }
        }

        res.json({ success: true, message: 'Responder assigned successfully', data: alert });
    } catch (err) {
        logger.error('Failed to assign SOS responder:', err);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
};

/**
 * PUT /api/sos/:id/resolve
 * ADMIN: Resolve an SOS alert with notes
 */
const resolveSOS = async (req, res) => {
    try {
        const { id } = req.params;
        const { notes } = req.body;

        const alert = await prisma.sOSAlert.update({
            where: { id },
            data: {
                status: 'RESOLVED',
                resolvedAt: new Date(),
                resolvedNotes: notes,
            },
            include: { user: { select: { id: true, name: true, phone: true } } },
        });

        const { emitToAdmins } = require('../services/socket.service');
        emitToAdmins('sos_updated', alert);

        // Push + SMS to user confirming their SOS has been resolved — non-fatal
        try {
            const { sendPushToUser } = require('../utils/pushNotification.service');
            await sendPushToUser(alert.userId, {
                title: 'SOS Alert Resolved',
                body: 'Your emergency alert has been resolved by the Ayuxa team. Stay safe!',
                data: { type: 'sos_resolved', sosId: alert.id },
            });
        } catch (pushErr) {
            logger.warn('resolveSOS: push failed (non-fatal):', pushErr.message);
        }

        res.json({ success: true, message: 'SOS alert resolved', data: alert });
    } catch (err) {
        logger.error('Failed to resolve SOS alert:', err);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
};

/**
 * PUT /api/sos/:id/notify
 * ADMIN: Update notification notes/logs for an SOS alert
 */
const updateSOSNotification = async (req, res) => {
    try {
        const { id } = req.params;
        const { notes } = req.body;

        const alert = await prisma.sOSAlert.update({
            where: { id },
            data: { callLogNotes: notes }
        });

        res.json({ success: true, message: 'Notification log updated', data: alert });
    } catch (err) {
        logger.error('Failed to update SOS notification log:', err);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
};

module.exports = { 
    triggerSOS, 
    getSOSAlerts, 
    assignResponder, 
    resolveSOS, 
    updateSOSNotification 
};
