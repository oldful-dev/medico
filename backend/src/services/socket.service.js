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
                // Allow all localhost origins or defined frontend URLs
                const allowed = [
                    "http://localhost:3000",
                    "http://localhost:3001",
                    "http://localhost:3003",
                    process.env.ADMIN_FRONTEND_URL,
                    process.env.WEB_FRONTEND_URL,
                ].filter(Boolean);
                
                if (!origin || allowed.some(a => a.includes(origin)) || origin.includes('localhost')) {
                    callback(null, true);
                } else {
                    callback(new Error('Not allowed by CORS'));
                }
            },
            methods: ["GET", "POST"],
            credentials: true
        }
    });

    io.on("connection", (socket) => {
        logger.info(`New Client Connected: ${socket.id}`);

        socket.on("join_admin_room", () => {
            socket.join("admin_feed");
            logger.info(`Socket ${socket.id} joined admin_feed`);
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

module.exports = {
    init,
    emitToAdmins,
    getIO: () => io
};
