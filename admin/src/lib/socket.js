import { io } from "socket.io-client";

const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL || "https://api.oldful.com";

let socket;

export const initSocket = () => {
    if (!socket) {
        socket = io(SOCKET_URL, {
            withCredentials: true,
            autoConnect: true,
        });

        socket.on("connect", () => {
            console.log("Connected to Real-time Gateway");
            socket.emit("join_admin_room");
        });

        socket.on("disconnect", () => {
            console.log("Disconnected from Gateway");
        });
    }
    return socket;
};

export const getSocket = () => {
    if (!socket) return initSocket();
    return socket;
};
