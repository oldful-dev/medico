// ──────────────────────────────────────────────
//  SOS Controller
// ──────────────────────────────────────────────

const prisma = require('../config/database');
const { logger } = require('../config/logger');
const { sendWhatsApp, sendEmail, sendPushToUser } = require('../utils/notifications');
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

    // 4. Build location link
    const locationLink = (resolvedLat && resolvedLng)
        ? `https://www.google.com/maps?q=${resolvedLat},${resolvedLng}`
        : 'Location unavailable';
    const addressDisplay = addressSnapshot || locationLink;

    // 5. Notify admin via WhatsApp — non-fatal
    let adminNotified = false;
    try {
        await sendWhatsApp({
            phoneNumber: process.env.ADMIN_EMERGENCY_PHONE || '919999999999',
            templateName: 'sos_alert_admin',
            parameters: [user.name, user.uniqueUserId, locationLink],
        });
        adminNotified = true;
    } catch (err) {
        logger.warn('SOS admin WhatsApp failed (non-fatal):', err.message);
    }

    // 6. Notify admin via email — non-fatal
    try {
        await sendEmail({
            to: process.env.ADMIN_EMAIL || 'admin@oldful.com',
            subject: `🚨 EMERGENCY: SOS triggered by ${user.name}`,
            html: `
                <h2>SOS Alert Triggered</h2>
                <p><strong>User:</strong> ${user.name} (${user.uniqueUserId})</p>
                <p><strong>Phone:</strong> ${user.phone}</p>
                <p><strong>Address:</strong> ${addressDisplay}</p>
                <p><strong>Map:</strong> <a href="${locationLink}">${locationLink}</a></p>
                <p>Please take immediate action.</p>
            `,
        });
        adminNotified = true;
    } catch (err) {
        logger.warn('SOS admin email failed (non-fatal):', err.message);
    }

    // 7. Notify family contacts via WhatsApp — non-fatal
    let familyNotified = false;
    try {
        const contacts = await prisma.emergencyContact.findMany({ where: { userId: user.id } });
        for (const contact of contacts) {
            try {
                await sendWhatsApp({
                    phoneNumber: contact.phone,
                    templateName: 'sos_alert_family',
                    parameters: [user.name, contact.name, locationLink],
                });
                familyNotified = true;
            } catch (err) {
                logger.warn(`SOS family WhatsApp to ${contact.phone} failed (non-fatal):`, err.message);
            }
        }
    } catch (err) {
        logger.warn('SOS family contacts fetch failed (non-fatal):', err.message);
    }

    // 8. Send push confirmation to user — non-fatal
    try {
        await sendPushToUser(user.id, {
            title: 'SOS Alert Sent',
            body: 'Your emergency alert has been sent to the Oldful team and your emergency contacts.',
            data: { type: 'sos_confirmation', sosId: sosAlert.id },
        });
    } catch (err) {
        logger.warn('SOS push to user failed (non-fatal):', err.message);
    }

    // 9. Update notification flags
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

        const { emitToAdmins } = require('../services/socket.service');
        emitToAdmins('sos_updated', alert);

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
            }
        });

        const { emitToAdmins } = require('../services/socket.service');
        emitToAdmins('sos_updated', alert);

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
