const prisma = require('../config/database');
const { logger } = require('../config/logger');
const emailService = require('../services/email');

/**
 * Join Wellness Waitlist
 * POST /api/waitlist
 */
exports.joinWaitlist = async (req, res, next) => {
    try {
        const { name, email, city, source } = req.body;

        if (!name || !email) {
            return res.status(400).json({
                success: false,
                message: 'Name and Email are required'
            });
        }

        // Upsert to prevent duplicates by email
        const entry = await prisma.wellnessWaitlist.upsert({
            where: { email: email.toLowerCase() },
            update: {
                name,
                city: city || null,
                source: source || 'wellness_page',
            },
            create: {
                name,
                email: email.toLowerCase(),
                city: city || null,
                source: source || 'wellness_page',
            }
        });

        // Trigger email dispatch (background)
        emailService.sendWaitlistConfirm({ to: email, name, serviceName: 'Ayuxa Wellness', city })
            .catch(err => logger.error('Waitlist Email failed:', err));

        res.status(200).json({
            success: true,
            message: 'Successfully joined the waitlist',
            data: entry
        });

    } catch (error) {
        logger.error('Waitlist error:', error);
        next(error);
    }
};

/**
 * Get all waitlist entries
 * GET /api/waitlist
 */
exports.getWaitlist = async (req, res, next) => {
    try {
        const entries = await prisma.wellnessWaitlist.findMany({
            orderBy: { createdAt: 'desc' }
        });
        res.status(200).json({
            success: true,
            count: entries.length,
            data: entries
        });
    } catch (error) {
        next(error);
    }
};
