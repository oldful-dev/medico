// ──────────────────────────────────────────────
//  SOS Controller
// ──────────────────────────────────────────────

const prisma = require('../config/database');
const { logger } = require('../config/logger');
const { sendWhatsApp, sendEmail } = require('../utils/notifications');

/**
 * Handle incoming SOS alert from Mobile App
 */
const triggerSOS = async (req, res) => {
    try {
        const { location } = req.body;
        const userId = req.user.id; // From auth middleware

        const user = await prisma.user.findUnique({
            where: { id: userId },
            include: {
                city: true,
                emergencyContacts: true,
            },
        });

        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        // 1. Create SOS record in DB
        const sosAlert = await prisma.sOSAlert.create({
            data: {
                userId: user.id,
                cityId: user.cityId,
                latitude: location?.latitude,
                longitude: location?.longitude,
                status: 'ACTIVE',
            },
        });

        // 2. Notify Admin via WhatsApp
        const locationLink = location 
            ? `https://www.google.com/maps?q=${location.latitude},${location.longitude}`
            : 'Unknown';

        await sendWhatsApp({
            phoneNumber: process.env.ADMIN_EMERGENCY_PHONE || '919999999999',
            templateName: 'sos_alert_admin',
            parameters: [user.name, user.uniqueUserId, locationLink],
        });

        // 3. Notify Admin via Email
        await sendEmail({
            to: process.env.ADMIN_EMAIL || 'admin@oldful.com',
            subject: `🚨 EMERGENCY: SOS triggered by ${user.name}`,
            html: `
                <h2>SOS Alert Triggered</h2>
                <p><strong>User:</strong> ${user.name} (${user.uniqueUserId})</p>
                <p><strong>Phone:</strong> ${user.phone}</p>
                <p><strong>Location:</strong> ${locationLink}</p>
                <p>Please take immediate action.</p>
            `,
        });

        // 4. Notify Family Contacts via WhatsApp
        for (const contact of user.emergencyContacts) {
            await sendWhatsApp({
                phoneNumber: contact.phone,
                templateName: 'sos_alert_family',
                parameters: [user.name, contact.name, locationLink],
            });
        }

        // Update SOS record as notified
        await prisma.sOSAlert.update({
            where: { id: sosAlert.id },
            data: { 
                adminNotified: true,
                familyNotified: true,
            },
        });

        res.status(200).json({ success: true, message: 'SOS alert processed and notifications sent' });
    } catch (error) {
        logger.error('SOS Trigger Backend Error:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
};

module.exports = {
    triggerSOS,
};
