const prisma = require('../config/database');
const { logger } = require('../config/logger');

/**
 * Parse basic User-Agent string to identify device, OS, and browser
 */
function parseUserAgent(uaString = '') {
    const ua = uaString.toLowerCase();
    let deviceType = 'PC';
    if (ua.includes('mobile') || ua.includes('android') || ua.includes('iphone')) {
        deviceType = 'Mobile';
    } else if (ua.includes('ipad') || ua.includes('tablet')) {
        deviceType = 'Tablet';
    }

    let os = 'Unknown OS';
    if (ua.includes('windows')) os = 'Windows';
    else if (ua.includes('macintosh') || ua.includes('mac os')) os = 'macOS';
    else if (ua.includes('linux')) os = 'Linux';
    else if (ua.includes('android')) os = 'Android';
    else if (ua.includes('iphone') || ua.includes('ipad')) os = 'iOS';

    let browser = 'Chrome';
    if (ua.includes('firefox')) browser = 'Firefox';
    else if (ua.includes('safari') && !ua.includes('chrome')) browser = 'Safari';
    else if (ua.includes('edg')) browser = 'Edge';

    return { deviceType, os, browser };
}

/**
 * Record new active Admin session upon login
 */
const recordAdminSession = async ({ adminId, ipAddress, userAgent }) => {
    try {
        const { deviceType, os, browser } = parseUserAgent(userAgent);
        return await prisma.adminSession.create({
            data: {
                adminId,
                deviceType,
                os,
                browser,
                ipAddress: ipAddress || '127.0.0.1',
                state: 'Delhi',
                isActive: true,
                lastActiveAt: new Date(),
            },
        });
    } catch (err) {
        logger.warn('[SessionService] recordAdminSession error:', err.message);
        return null;
    }
};

/**
 * Record new active User session upon login
 */
const recordUserSession = async ({ userId, ipAddress, userAgent }) => {
    try {
        const { deviceType, os, browser } = parseUserAgent(userAgent);
        return await prisma.userSession.create({
            data: {
                userId,
                deviceType,
                os,
                browser,
                ipAddress: ipAddress || '127.0.0.1',
                state: 'Delhi',
                isActive: true,
                lastActiveAt: new Date(),
            },
        });
    } catch (err) {
        logger.warn('[SessionService] recordUserSession error:', err.message);
        return null;
    }
};

/**
 * Get active sessions for real-time Super Admin monitoring dashboard
 */
const getActiveSessions = async ({ type = 'all', state }) => {
    const adminWhere = { isActive: true };
    const userWhere = { isActive: true };

    if (state) {
        adminWhere.state = state;
        userWhere.state = state;
    }

    const [adminSessions, userSessions] = await Promise.all([
        type === 'user' ? [] : prisma.adminSession.findMany({
            where: adminWhere,
            include: {
                admin: {
                    select: { id: true, name: true, email: true, role: true, city: { select: { name: true, stateCode: true } } }
                }
            },
            orderBy: { lastActiveAt: 'desc' }
        }),
        type === 'admin' ? [] : prisma.userSession.findMany({
            where: userWhere,
            include: {
                user: {
                    select: { id: true, name: true, phone: true, email: true, uniqueUserId: true, city: { select: { name: true, stateCode: true } } }
                }
            },
            orderBy: { lastActiveAt: 'desc' }
        })
    ]);

    return {
        totalActive: adminSessions.length + userSessions.length,
        adminSessions: adminSessions.map(s => ({
            id: s.id,
            type: 'ADMIN',
            name: s.admin?.name || 'Admin',
            email: s.admin?.email,
            role: s.admin?.role,
            city: s.admin?.city?.name || 'Delhi',
            state: s.state || 'Delhi',
            deviceType: s.deviceType,
            browser: s.browser,
            os: s.os,
            ipAddress: s.ipAddress,
            lastActiveAt: s.lastActiveAt,
        })),
        userSessions: userSessions.map(s => ({
            id: s.id,
            type: 'USER',
            name: s.user?.name || 'User',
            phone: s.user?.phone,
            email: s.user?.email,
            uniqueUserId: s.user?.uniqueUserId,
            city: s.user?.city?.name || 'Delhi',
            state: s.state || 'Delhi',
            deviceType: s.deviceType,
            browser: s.browser,
            os: s.os,
            ipAddress: s.ipAddress,
            lastActiveAt: s.lastActiveAt,
        }))
    };
};

/**
 * Terminate a remote active session
 */
const terminateSession = async (sessionId, sessionType = 'ADMIN') => {
    if (sessionType === 'ADMIN') {
        return await prisma.adminSession.update({
            where: { id: sessionId },
            data: { isActive: false }
        });
    } else {
        return await prisma.userSession.update({
            where: { id: sessionId },
            data: { isActive: false }
        });
    }
};

module.exports = {
    recordAdminSession,
    recordUserSession,
    getActiveSessions,
    terminateSession,
};
