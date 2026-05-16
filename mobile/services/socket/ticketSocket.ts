import { io, Socket } from 'socket.io-client';

const SOCKET_URL = process.env.EXPO_PUBLIC_SOCKET_URL || 'https://api.ayuxacare.com';

let socket: Socket | null = null;

/**
 * Initialize socket connection for real-time ticket messages
 * Joins user room to receive real-time updates from admin
 */
export const initTicketSocket = (userId?: string): Socket | null => {
    if (!socket) {
        socket = io(SOCKET_URL, {
            withCredentials: true,
            autoConnect: false,
            transports: ['websocket', 'polling'],
            reconnection: true,
            reconnectionAttempts: Infinity,
            reconnectionDelay: 1000,
            reconnectionDelayMax: 5000,
            timeout: 20000,
        });

        socket.on('connect_error', (err) => {
            console.warn('[TicketSocket] connect error:', err.message);
        });

        socket.on('disconnect', (reason) => {
            console.debug('[TicketSocket] disconnected:', reason);
        });
    }

    // Join user room when connected
    socket.on('connect', () => {
        if (userId) {
            socket!.emit('join_user_room', userId);
            console.log('[TicketSocket] joined user room:', userId);
        }
    });

    // If already connected but userId changed, join the room immediately
    if (socket.connected && userId) {
        socket.emit('join_user_room', userId);
    }

    if (!socket.connected) {
        socket.connect();
    }

    return socket;
};

/**
 * Get the current socket instance
 */
export const getTicketSocket = (): Socket | null => socket;

/**
 * Disconnect socket
 */
export const disconnectTicketSocket = () => {
    if (socket) {
        socket.disconnect();
        socket = null;
    }
};

/**
 * Listen for real-time ticket messages from admin
 * Callback receives { ticketId, message, senderName }
 */
export const onTicketMessageAdded = (
    callback: (data: { ticketId: string; message: any; senderName: string }) => void
): (() => void) => {
    const socket = getTicketSocket();
    if (!socket) {
        console.warn('[TicketSocket] Socket not initialized');
        return () => {};
    }

    socket.on('ticket_message_added', callback);

    // Return cleanup function
    return () => {
        socket.off('ticket_message_added', callback);
    };
};
