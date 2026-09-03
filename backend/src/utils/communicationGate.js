// ──────────────────────────────────────────────
//  Communication Gate
//  Single place every send channel (WhatsApp/SMS/Email/Push) checks before
//  contacting a known user, so a deleted/blocked account can never receive
//  communication regardless of which channel or code path triggers it.
// ──────────────────────────────────────────────

const prisma = require('../config/database');
const { logger } = require('../config/logger');

/**
 * @param {string|null} userId - internal user id, or null for sends with no
 *   known account yet (e.g. signup OTP to an unregistered phone number),
 *   which are always allowed.
 * @returns {Promise<{ allowed: boolean, reason?: string }>}
 */
const canSendTo = async (userId) => {
    if (!userId) return { allowed: true };

    try {
        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: { status: true },
        });

        if (!user) return { allowed: false, reason: 'Recipient user not found' };
        if (user.status !== 'ACTIVE') return { allowed: false, reason: `Recipient user is ${user.status.toLowerCase()}` };

        return { allowed: true };
    } catch (err) {
        // Fail open on infra failure — matches the existing preference-check
        // convention (_isWhatsAppEnabled) of not blocking sends on a DB blip.
        logger.warn('[CommunicationGate] Status check failed (failing open):', err.message);
        return { allowed: true };
    }
};

module.exports = { canSendTo };
