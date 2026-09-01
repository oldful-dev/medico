const { Server } = require("socket.io");
const { logger } = require("../config/logger");
const jwt = require('jsonwebtoken');

let io;

/**
 * Initialize Socket.io Server
 * @param {import('http').Server} httpServer
 */
const init = (httpServer) => {
    io = new Server(httpServer, {
        cors: {
            origin: (origin, callback) => {
                const allowed = [
                    'http://localhost:3000',
                    'http://localhost:3001',
                    'http://localhost:3003',
                    'https://ayuxa.com',
                    'https://www.ayuxa.com',
                    'https://admin.ayuxa.com',
                    'https://ayuxacare.com',
                    'https://www.ayuxacare.com',
                    'https://admin.ayuxacare.com',
                    'https://oldful-admin.vercel.app',
                    process.env.ADMIN_FRONTEND_URL,
                    process.env.APP_FRONTEND_URL,
                    process.env.WEB_FRONTEND_URL,
                ].filter(Boolean);

                if (!origin) return callback(null, true);

                const isAllowed = allowed.includes(origin) ||
                    origin.includes('localhost') ||
                    origin.includes('127.0.0.1');

                if (isAllowed) {
                    callback(null, true);
                } else {
                    // Mobile apps send no Origin header at all and are already
                    // handled by the `!origin` check above — anything that
                    // reaches here IS a browser origin that failed the
                    // allowlist, so it must be rejected, not waved through.
                    logger.warn(`[Socket] CORS blocked: ${origin}`);
                    callback(null, false);
                }
            },
            methods: ['GET', 'POST'],
            credentials: true,
        },
        transports: ['websocket', 'polling'],
        pingTimeout: 60000,
        pingInterval: 25000,
    });

    // Authentication middleware
    io.use((socket, next) => {
        let token = socket.handshake.auth.token || socket.handshake.headers.authorization?.split(' ')[1];

        // admin.ayuxacare.com now sends the admin token as an HttpOnly
        // cookie (withCredentials: true on the socket client) rather than
        // in the `auth` payload — parse it out of the raw handshake cookie
        // header, same fallback pattern as the HTTP authenticateAdmin
        // middleware.
        if (!token && socket.handshake.headers.cookie) {
            try {
                const cookies = require('cookie').parse(socket.handshake.headers.cookie);
                token = cookies.adminToken;
            } catch { /* fall through to unauthenticated */ }
        }

        if (!token) {
            logger.debug('[Socket] No token provided, allowing unauthenticated connection for now');
            return next();
        }

        try {
            const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
            socket.userId = decoded.id || decoded.userId;
            socket.userRole = decoded.role;
            logger.debug(`[Socket] Authenticated user: ${socket.userId}`);
            next();
        } catch (err) {
            logger.warn(`[Socket] Auth error: ${err.message}`);
            next();
        }
    });

    io.on("connection", (socket) => {
        logger.info(`New Client Connected: ${socket.id} (userId: ${socket.userId || 'anonymous'})`);

        socket.on("authenticate", (data) => {
            try {
                const token = data?.token;
                if (!token) return;
                const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
                socket.userId = decoded.id || decoded.userId;
                socket.userRole = decoded.role;
                logger.info(`[Socket] Dynamically authenticated user: ${socket.userId} (${socket.userRole})`);

                // Dynamically join user room
                socket.join(`user_${socket.userId}`);

                // Dynamically join admin feed if admin
                if (socket.userRole === 'ADMIN' || socket.userRole === 'SUPER_ADMIN') {
                    socket.join("admin_feed");
                    logger.info(`Socket ${socket.id} dynamically joined admin_feed`);
                }
            } catch (err) {
                logger.warn(`[Socket] Dynamic auth failed: ${err.message}`);
            }
        });

        socket.on("join_admin_room", () => {
            if (socket.userRole === 'ADMIN' || socket.userRole === 'SUPER_ADMIN') {
                socket.join("admin_feed");
                logger.info(`Socket ${socket.id} joined admin_feed`);
            } else {
                logger.warn(`Socket ${socket.id} attempted to join admin_feed without permission`);
            }
        });

        socket.on("join_user_room", (userId) => {
            // Allow user to join their own room only
            if (socket.userId && socket.userId === userId) {
                socket.join(`user_${userId}`);
                logger.info(`Socket ${socket.id} joined user_${userId}`);
            } else if (!socket.userId && userId) {
                // Allow unauthenticated connections to join a room (for testing)
                socket.join(`user_${userId}`);
                logger.debug(`Socket ${socket.id} (unauthenticated) joined user_${userId}`);
            } else {
                logger.warn(`Socket ${socket.id} attempted to join user_${userId} but authenticated as ${socket.userId}`);
            }
        });

        socket.on("disconnect", () => {
            logger.info(`Client Disconnected: ${socket.id}`);
        });
    });

    return io;
};

/**
 * Emit event to all admins
 * @param {string} event
 * @param {any} data
 */
const emitToAdmins = (event, data) => {
    if (io) {
        try {
            io.to("admin_feed").emit(event, data);
        } catch (err) {
            console.warn(`[Socket] Failed to emit ${event}:`, err.message);
        }
    }
};

/**
 * Emit event to a specific user's room
 * @param {string} userId
 * @param {string} event
 * @param {any} data
 */
const emitToUser = (userId, event, data) => {
    if (io && userId) {
        try {
            io.to(`user_${userId}`).emit(event, data);
        } catch (err) {
            console.warn(`[Socket] Failed to emit ${event} to user ${userId}:`, err.message);
        }
    }
};

/**
 * Emit event to ALL connected clients (broadcast)
 * @param {string} event
 * @param {any} data
 */
const emitToAll = (event, data) => {
    if (io) {
        try {
            io.emit(event, data);
        } catch (err) {
            console.warn(`[Socket] Failed to emit ${event} to all clients:`, err.message);
        }
    }
};

module.exports = {
    init,
    emitToAdmins,
    emitToUser,
    emitToAll,
    getIO: () => io
};
