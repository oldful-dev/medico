const { Server } = require("socket.io");
const { logger } = require("../config/logger");

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
                    logger.warn(`[Socket] CORS blocked: ${origin}`);
                    callback(null, true); // allow anyway to avoid blocking real admin panel
                }
            },
            methods: ['GET', 'POST'],
            credentials: true,
        },
        transports: ['websocket', 'polling'],
        pingTimeout: 60000,
        pingInterval: 25000,
    });

    io.on("connection", (socket) => {
        logger.info(`New Client Connected: ${socket.id}`);

        socket.on("join_admin_room", () => {
            socket.join("admin_feed");
            logger.info(`Socket ${socket.id} joined admin_feed`);
        });

        socket.on("join_user_room", (userId) => {
            if (userId) {
                socket.join(`user_${userId}`);
                logger.info(`Socket ${socket.id} joined user_${userId}`);
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

module.exports = {
    init,
    emitToAdmins,
    emitToUser,
    getIO: () => io
};
