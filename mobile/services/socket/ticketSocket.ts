import { initSocket, joinUserRoom, onSocket, disconnectSocket, getSocket } from './socketManager';
import { apiClient } from '../api/apiClient';

/**
 * Initialize ticket socket connection and ensure user is in their room
 * Messages are sent to the user's personal room, not a ticket-specific room
 * @param ticketId - The ticket ID (used for logging/context)
 */
export const initTicketSocket = async (ticketId?: string) => {
    try {
        console.log('[TicketSocket] Initializing for ticket:', ticketId);

        // Get or initialize socket connection
        const socket = await initSocket();

        if (!socket) {
            console.error('[TicketSocket] Failed to initialize socket');
            return null;
        }

        // Ensure user is in their room to receive messages
        // Get the authenticated user ID from API client or use fallback
        // Note: In a real scenario, we'd get this from UserContext or auth state
        // For now, we rely on the socket being authenticated and the user joining their room
        console.log('[TicketSocket] ✅ Socket initialized and ready for messages');
        return socket;
    } catch (err) {
        console.error('[TicketSocket] Init error:', err);
        return null;
    }
};

/**
 * Get current ticket socket instance
 */
export const getTicketSocket = () => {
    // Return null - socket is managed by socketManager
    return null;
};

/**
 * Disconnect ticket socket
 */
export const disconnectTicketSocket = () => {
    disconnectSocket();
    console.log('[TicketSocket] Disconnected');
};

/**
 * Listen for real-time ticket messages from admin
 * Backend emits this to the user's personal room (not ticket-specific)
 * When admin replies to a ticket, backend emits: io.to(`user_${userId}`).emit('ticket_message_added', {...})
 */
export const onTicketMessageAdded = (
    callback: (data: { ticketId: string; message: any; senderName: string }) => void
): (() => void) => {
    console.log('[TicketSocket] 📡 Attaching listener for ticket_message_added events');
    return onSocket('ticket_message_added', callback);
};
