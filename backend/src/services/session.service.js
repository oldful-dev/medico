const prisma = require('../config/database');
const { logger } = require('../config/logger');
const axios = require('axios');

/**
 * Geolocate external IP address
 */
async function geolocateIp(ip) {
    if (!ip || ip === '127.0.0.1' || ip === '::1' || ip.startsWith('192.168.') || ip.startsWith('10.')) {
        return { city: 'Localhost', state: 'Local' };
    }
    try {
        const response = await axios.get(`http://ip-api.com/json/${ip}`, { timeout: 2000 });
        if (response.data && response.data.status === 'success') {
            return {
                city: response.data.city || 'Unknown City',
                state: response.data.regionName || response.data.region || 'Unknown State'
            };
        }
    } catch (err) {
        // Fallback silently
    }
    return null;
}

/**
 * Extract real client IP, City, State, and OS/Browser info from request
 */
function extractClientInfo(req) {
    const rawIp = req?.headers?.['cf-connecting-ip'] ||
                  (req?.headers?.['x-forwarded-for'] ? req.headers['x-forwarded-for'].split(',')[0].trim() : null) ||
                  req?.ip ||
                  '127.0.0.1';

    let ipAddress = rawIp;
    if (ipAddress.includes('::ffff:')) {
        ipAddress = ipAddress.split(':').pop();
    } else if (ipAddress === '::1') {
        ipAddress = '127.0.0.1';
    }

    let city = req?.headers?.['cf-ipcity'] ? decodeURIComponent(req.headers['cf-ipcity']) : null;
    let rawState = req?.headers?.['cf-region-code'] || req?.headers?.['cf-region'] || null;

    const STATE_MAP = {
        'DL': 'Delhi',
        'UP': 'Uttar Pradesh',
        'MH': 'Maharashtra',
        'KA': 'Karnataka',
        'TN': 'Tamil Nadu',
        'WB': 'West Bengal',
        'HR': 'Haryana',
        'PB': 'Punjab',
        'GJ': 'Gujarat',
        'RJ': 'Rajasthan',
        'TS': 'Telangana',
        'AP': 'Andhra Pradesh'
    };

    let state = rawState && STATE_MAP[rawState.toUpperCase()] ? STATE_MAP[rawState.toUpperCase()] : rawState;

    // Native apps set no browser UA, so they'd fall through to PC/Windows/Chrome.
    // The mobile client sends X-Client-Info: "app; platform=ios; version=17.4" —
    // trust that first, fall back to UA sniffing for web/admin.
    const clientInfo = (req?.headers?.['x-client-info'] || '').toLowerCase();
    if (clientInfo.startsWith('app;')) {
        const platform = /platform=(\w+)/.exec(clientInfo)?.[1] || '';
        const os = platform === 'ios' ? 'iOS' : platform === 'android' ? 'Android' : 'Mobile';
        const deviceType = platform === 'ipados' ? 'Tablet' : 'Mobile';
        return { ipAddress, city, state, deviceType, os, browser: 'Ayuxa App' };
    }

    const uaString = (req?.get?.('user-agent') || req?.headers?.['user-agent'] || '').toLowerCase();
    let deviceType = 'PC';
    if (uaString.includes('mobile') || uaString.includes('android') || uaString.includes('iphone')) {
        deviceType = 'Mobile';
    } else if (uaString.includes('ipad') || uaString.includes('tablet')) {
        deviceType = 'Tablet';
    }

    let os = 'Windows';
    if (uaString.includes('macintosh') || uaString.includes('mac os')) os = 'macOS';
    else if (uaString.includes('linux')) os = 'Linux';
    else if (uaString.includes('android')) os = 'Android';
    else if (uaString.includes('iphone') || uaString.includes('ipad')) os = 'iOS';

    let browser = 'Chrome';
    if (uaString.includes('firefox')) browser = 'Firefox';
    else if (uaString.includes('safari') && !uaString.includes('chrome')) browser = 'Safari';
    else if (uaString.includes('edg')) browser = 'Edge';

    return { ipAddress, city, state, deviceType, os, browser };
}

/**
 * Record new active Admin session upon login
 */
const recordAdminSession = async ({ adminId, req }) => {
    try {
        const info = extractClientInfo(req);

        let finalCity = info.city;
        let finalState = info.state;

        // Geolocate external IP if headers are missing
        if (!finalCity || !finalState) {
            const geo = await geolocateIp(info.ipAddress);
            if (geo) {
                finalCity = geo.city;
                finalState = geo.state;
            }
        }

        // Fallback to assigned Admin City in DB
        if (!finalCity || !finalState) {
            const admin = await prisma.admin.findUnique({
                where: { id: adminId },
                select: { city: { select: { name: true, stateCode: true } } }
            });
            if (admin?.city) {
                finalCity = finalCity || admin.city.name;
                finalState = finalState || admin.city.stateCode || 'Delhi';
            }
        }

        const session = await prisma.adminSession.create({
            data: {
                adminId,
                deviceType: info.deviceType,
                os: info.os,
                browser: info.browser,
                ipAddress: info.ipAddress,
                city: finalCity || 'Delhi NCR',
                state: finalState || 'Delhi',
                isActive: true,
                lastActiveAt: new Date(),
            },
        });

        try {
            const { emitToAdmins } = require('./socket.service');
            emitToAdmins('session_update', {
                event: 'LOGIN',
                sessionType: 'ADMIN',
                id: session.id,
                ipAddress: info.ipAddress,
                city: finalCity || 'Delhi NCR',
                state: finalState || 'Delhi',
                deviceType: info.deviceType,
                os: info.os,
                browser: info.browser
            });
        } catch (e) {
            logger.warn('[SessionService] Socket emit error:', e.message);
        }

        return session;
    } catch (err) {
        logger.warn('[SessionService] recordAdminSession error:', err.message);
        return null;
    }
};

/**
 * Record new active User session upon login
 */
const recordUserSession = async ({ userId, req }) => {
    try {
        const info = extractClientInfo(req);

        let finalCity = info.city;
        let finalState = info.state;

        // Geolocate external IP if headers are missing
        if (!finalCity || !finalState) {
            const geo = await geolocateIp(info.ipAddress);
            if (geo) {
                finalCity = geo.city;
                finalState = geo.state;
            }
        }

        // Fallback to assigned User City in DB
        if (!finalCity || !finalState) {
            const user = await prisma.user.findUnique({
                where: { id: userId },
                select: { city: { select: { name: true, stateCode: true } } }
            });
            if (user?.city) {
                finalCity = finalCity || user.city.name;
                finalState = finalState || user.city.stateCode || 'Delhi';
            }
        }

        // Re-login from the same device shouldn't spawn a new "active" row.
        // No stable device id from the app yet, so key on userId + platform.
        const sessionData = {
            userId,
            deviceType: info.deviceType,
            os: info.os,
            browser: info.browser,
            ipAddress: info.ipAddress,
            city: finalCity || 'Delhi NCR',
            state: finalState || 'Delhi',
            isActive: true,
            lastActiveAt: new Date(),
        };
        const existing = await prisma.userSession.findFirst({
            where: { userId, deviceType: info.deviceType, os: info.os },
        });
        const session = existing
            ? await prisma.userSession.update({ where: { id: existing.id }, data: sessionData })
            : await prisma.userSession.create({ data: sessionData });

        try {
            const { emitToAdmins } = require('./socket.service');
            emitToAdmins('session_update', {
                event: 'LOGIN',
                sessionType: 'USER',
                id: session.id,
                ipAddress: info.ipAddress,
                city: finalCity || 'Delhi NCR',
                state: finalState || 'Delhi',
                deviceType: info.deviceType,
                os: info.os,
                browser: info.browser
            });
        } catch (e) {
            logger.warn('[SessionService] Socket emit error:', e.message);
        }

        return session;
    } catch (err) {
        logger.warn('[SessionService] recordUserSession error:', err.message);
        return null;
    }
};

/**
 * Get active sessions for real-time Super Admin monitoring dashboard
 */
const getActiveSessions = async ({ type = 'all', state }) => {
    // "Active" for the dashboard = flagged active AND seen in the last 7 days.
    // Guards against stale rows before the reaper cron catches them.
    const recentlySeen = { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) };
    const adminWhere = { isActive: true, lastActiveAt: recentlySeen };
    const userWhere = { isActive: true, lastActiveAt: recentlySeen };

    if (state) {
        adminWhere.state = { contains: state, mode: 'insensitive' };
        userWhere.state = { contains: state, mode: 'insensitive' };
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
            city: s.city || s.admin?.city?.name || 'Delhi NCR',
            state: s.state || s.admin?.city?.stateCode || 'Delhi',
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
            city: s.city || s.user?.city?.name || 'Delhi NCR',
            state: s.state || s.user?.city?.stateCode || 'Delhi',
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
const terminateSession = async (sessionId) => {
    // Try to terminate admin session first
    const adminSession = await prisma.adminSession.findUnique({ where: { id: sessionId } });
    if (adminSession) {
        const res = await prisma.adminSession.update({
            where: { id: sessionId },
            data: { isActive: false }
        });
        try {
            const { emitToAdmins } = require('./socket.service');
            emitToAdmins('session_update', {
                event: 'TERMINATE',
                sessionType: 'ADMIN',
                id: sessionId
            });
        } catch (e) {
            logger.warn('[SessionService] Socket emit error:', e.message);
        }
        return res;
    }

    // Try to terminate user session
    const userSession = await prisma.userSession.findUnique({ where: { id: sessionId } });
    if (userSession) {
        const res = await prisma.userSession.update({
            where: { id: sessionId },
            data: { isActive: false }
        });
        try {
            const { emitToAdmins } = require('./socket.service');
            emitToAdmins('session_update', {
                event: 'TERMINATE',
                sessionType: 'USER',
                id: sessionId
            });
        } catch (e) {
            logger.warn('[SessionService] Socket emit error:', e.message);
        }
        return res;
    }
};

module.exports = {
    recordAdminSession,
    recordUserSession,
    getActiveSessions,
    terminateSession,
};
