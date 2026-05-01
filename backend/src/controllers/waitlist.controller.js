const prisma = require('../config/database');
const { logger } = require('../config/logger');
const { sendEmail } = require('../utils/notifications');

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

        const isCityWaitlist = source === 'city_selection';
        const emailSubject = isCityWaitlist
            ? `We're coming to ${city || 'your city'} soon! 🚀`
            : "You're on the Oldful Wellness waitlist 🎉";
        const emailHtml = `
            <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e0e0e0; border-radius: 12px; overflow: hidden;">
                <div style="background-color: #048357; padding: 40px 20px; text-align: center;">
                    <h1 style="color: #ffffff; margin: 0; font-size: 28px;">${isCityWaitlist ? `Coming to ${city || 'your city'} soon! 🚀` : "You're on the list! 🎉"}</h1>
                </div>
                <div style="padding: 30px; background-color: #ffffff;">
                    <p style="font-size: 16px; color: #333333;">Hi ${name},</p>
                    <p style="font-size: 16px; color: #555555; line-height: 1.6;">
                        ${isCityWaitlist
                            ? `Thanks for your interest in Oldful services in <strong>${city || 'your city'}</strong>! We're working hard to expand there and you'll be the <strong>first to know</strong> when we launch.`
                            : `Thanks for joining the Oldful Wellness waitlist. We're thrilled to have you with us!`
                        }
                    </p>
                    <p style="font-size: 16px; color: #555555; line-height: 1.6;">
                        ${isCityWaitlist
                            ? `We'll send you an exclusive early-access invite as soon as Oldful goes live in <strong>${city || 'your city'}</strong>.`
                            : `You are now among the first to be notified when we launch our personalized wellness plans, fitness tracking, and mindfulness exercises in <strong>${city || 'your city'}</strong>.`
                        }
                    </p>
                    <div style="margin: 30px 0; text-align: center;">
                        <a href="https://oldful.vercel.app/app/services" style="background-color: #048357; color: #ffffff; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">Explore Our Services</a>
                    </div>
                    <p style="font-size: 14px; color: #888888; margin-top: 40px; border-top: 1px solid #eeeeee; padding-top: 20px;">
                        Stay tuned for more updates.<br>
                        Best regards,<br>
                        <strong>Team Oldful</strong>
                    </p>
                </div>
                <div style="background-color: #f9f9f9; padding: 20px; text-align: center; font-size: 12px; color: #999999;">
                    &copy; 2026 Oldful Healthcare. All rights reserved.
                </div>
            </div>
        `;

        // Trigger email dispatch (background)
        sendEmail({
            to: email,
            subject: emailSubject,
            html: emailHtml
        }).catch(err => logger.error('Waitlist Email failed:', err));

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
