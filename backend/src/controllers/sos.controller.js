// ──────────────────────────────────────────────
//  SOS Controller
// ──────────────────────────────────────────────

const prisma = require('../config/database');
const { logger } = require('../config/logger');
const { sendWhatsApp, sendEmail, sendPushToUser } = require('../utils/notifications');
const { reverseGeocode } = require('../utils/geocoding.service');

/**
 * POST /api/sos
 * Handle incoming SOS alert from Mobile App.
 * Notifications are non-fatal — SOS is always saved to DB regardless of notification failures.
 */
const triggerSOS = async (req, res) => {
    const { location } = req.body;
    // authenticateUser middleware loads full user into req.appUser
    const user = req.appUser;

    // 1. Reverse geocode — non-fatal
    let addressSnapshot = null;
    if (location?.latitude && location?.longitude) {
        try {
            const geo = await reverseGeocode(location.latitude, location.longitude);
            if (geo) addressSnapshot = geo.formattedAddress;
        } catch (geoErr) {
            logger.warn('SOS reverse geocode failed (non-fatal):', geoErr.message);
        }
    }

    // 2. Save SOS record to DB
    let sosAlert;
    try {
        sosAlert = await prisma.sOSAlert.create({
            data: {
                userId: user.id,
                cityId: user.cityId,
                latitude: location?.latitude ?? null,
                longitude: location?.longitude ?? null,
                addressSnapshot,
                status: 'ACTIVE',
                adminNotified: false,
                familyNotified: false,
            },
        });
    } catch (dbErr) {
        logger.error('SOS DB create failed:', dbErr);
        return res.status(500).json({ success: false, message: 'Failed to record SOS alert' });
    }

    // 3. Build location link
    const locationLink = (location?.latitude && location?.longitude)
        ? `https://www.google.com/maps?q=${location.latitude},${location.longitude}`
        : 'Location unavailable';
    const addressDisplay = addressSnapshot || locationLink;

    // 4. Notify admin via WhatsApp — non-fatal
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

    // 5. Notify admin via email — non-fatal
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

    // 6. Notify family contacts via WhatsApp — non-fatal
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

    // 7. Send push confirmation to user — non-fatal
    try {
        await sendPushToUser(user.id, {
            title: 'SOS Alert Sent',
            body: 'Your emergency alert has been sent to the Oldful team and your emergency contacts.',
            data: { type: 'sos_confirmation', sosId: sosAlert.id },
        });
    } catch (err) {
        logger.warn('SOS push to user failed (non-fatal):', err.message);
    }

    // 8. Update notification flags
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

module.exports = { triggerSOS };
