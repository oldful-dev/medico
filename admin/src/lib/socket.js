import { io } from "socket.io-client";
import Cookies from "js-cookie";

const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL || "https://api.ayuxacare.com";

let socket = null;
let listeners = {};
let connectionPromise = null;

/**
 * Get auth token from cookies (admin stores it in Cookies)
 */
const getAuthToken = () => {
    try {
        // Admin stores token in cookie named 'adminToken'
        const token = Cookies.get("adminToken");
        if (token) {
            console.log("[Socket] 🔑 Auth token found in cookies");
            return token;
        }
    } catch (err) {
        console.error("[Socket] Error reading auth token:", err);
    }
    console.log("[Socket] ⚠️ No auth token found");
    return null;
};

export const initSocket = () => {
    // Never run on server — socket.io-client requires browser APIs
    if (typeof window === "undefined") return null;
    if (socket) return socket;

    // If already initializing, return pending promise
    if (connectionPromise) {
        console.log("[Socket] ⏳ Initialization in progress...");
        return connectionPromise;
    }

    connectionPromise = new Promise((resolve) => {
        const token = getAuthToken();
        console.log(`[Socket] 🔌 Initializing with URL: ${SOCKET_URL}, auth: ${token ? 'yes' : 'no'}`);

        socket = io(SOCKET_URL, {
            auth: token ? { token } : {},
            withCredentials: true,
            autoConnect: false,
            transports: ["websocket", "polling"],
            reconnection: true,
            reconnectionAttempts: Infinity,
            reconnectionDelay: 1000,
            reconnectionDelayMax: 5000,
            timeout: 20000,
        });

        socket.on("connect", () => {
            console.log("[Socket] ✅ Connected, socket ID:", socket.id);
            socket.emit("join_admin_room");
            console.log("[Socket] 📡 Emitted join_admin_room");

            // Re-attach all listeners on reconnect
            Object.entries(listeners).forEach(([event, callback]) => {
                socket.on(event, callback);
            });

            resolve(socket);
        });

        socket.on("connect_error", (err) => {
            console.error("[Socket] ❌ Connection error:", err.message);
            resolve(socket); // Still resolve even on error
        });

        socket.on("disconnect", (reason) => {
            console.warn("[Socket] ⚠️ Disconnected:", reason);
        });

        socket.on("error", (err) => {
            console.error("[Socket] ❌ Socket error:", err);
        });

        socket.connect();
    });

    return connectionPromise;
};

export const getSocket = async () => {
    if (!socket) {
        return await initSocket();
    }
    return socket;
};

export const onSocketEvent = async (event, callback) => {
    const s = await getSocket();
    if (!s) {
        console.error(`[Socket] ❌ Socket not available for event: ${event}`);
        return;
    }

    listeners[event] = callback;
    s.on(event, callback);
    console.log(`[Socket] 📡 Registered listener for: ${event}`);
};
