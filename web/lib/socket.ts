import { io, Socket } from "socket.io-client";

const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL || "https://api.ayuxa.com";

let socket: Socket | null = null;

export const initSocket = (userId?: string): Socket | null => {
    if (typeof window === "undefined") return null;
    if (socket?.connected) return socket;

    if (!socket) {
        socket = io(SOCKET_URL, {
            withCredentials: true,
            autoConnect: false,
            transports: ["websocket", "polling"],
            reconnection: true,
            reconnectionAttempts: Infinity,
            reconnectionDelay: 1000,
            reconnectionDelayMax: 5000,
            timeout: 20000,
        });

        socket.on("connect_error", (err) => {
            console.warn("[Socket] connect error:", err.message);
        });

        socket.on("disconnect", (reason) => {
            console.debug("[Socket] disconnected:", reason);
        });
    }

    socket.on("connect", () => {
        if (userId) {
            socket!.emit("join_user_room", userId);
        }
    });

    // If already connected but userId changed, join the room immediately
    if (socket.connected && userId) {
        socket.emit("join_user_room", userId);
    }

    if (!socket.connected) {
        socket.connect();
    }

    return socket;
};

export const getSocket = (): Socket | null => socket;

export const disconnectSocket = () => {
    if (socket) {
        socket.disconnect();
        socket = null;
    }
};
