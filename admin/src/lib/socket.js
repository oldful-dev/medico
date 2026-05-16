import { io } from "socket.io-client";

const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL || "https://api.ayuxacare.com";

let socket = null;

export const initSocket = () => {
    // Never run on server — socket.io-client requires browser APIs
    if (typeof window === "undefined") return null;
    if (socket) return socket;

    socket = io(SOCKET_URL, {
        withCredentials: true,
        autoConnect: false,           // connect explicitly below
        transports: ["websocket", "polling"],
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

    socket.connect();

    return socket;
};

export const getSocket = () => {
    if (!socket) return initSocket();
    return socket;
};
