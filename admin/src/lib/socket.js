import { io } from "socket.io-client";

const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL || "https://api.oldful.com";

let socket;

export const initSocket = () => {
    if (!socket) {
        socket = io(SOCKET_URL, {
            withCredentials: true,
            autoConnect: true,
            transports: ['websocket', 'polling'],
            reconnection: true,
            reconnectionAttempts: Infinity,
            reconnectionDelay: 1000,
            reconnectionDelayMax: 5000,
            timeout: 20000,
        });

        socket.on("connect", () => {
            console.log("✅ Socket connected:", socket.id);
            socket.emit("join_admin_room");
        });

        socket.on("connect_error", (err) => {
            console.warn("❌ Socket connect error:", err.message);
        });

        socket.on("disconnect", (reason) => {
            console.log("⚡ Socket disconnected:", reason);
        });
    }
    return socket;
};

export const getSocket = () => {
    if (!socket) return initSocket();
    return socket;
};
