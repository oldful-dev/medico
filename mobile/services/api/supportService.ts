// ──────────────────────────────────────────────
//  Support Service — Wired to backend support routes
//  GET  /api/support/my-tickets
//  POST /api/support/tickets
//  GET  /api/support/tickets/:id
//  POST /api/support/tickets/:id/messages
// ──────────────────────────────────────────────

import { apiClient, ApiResponse } from './apiClient';

export type TicketStatus = 'open' | 'in_progress' | 'resolved' | 'closed';
export type TicketPriority = 'low' | 'medium' | 'high';
export type TicketCategory = 'billing' | 'service' | 'complaint' | 'lab' | 'technical' | 'other';

export interface SupportTicket {
    id: string;
    ticketCode: string;
    userId: string;
    subject: string;
    description: string;
    category: TicketCategory;
    priority: TicketPriority;
    status: TicketStatus;
    resolvedAt?: string;
    resolutionNote?: string;
    createdAt: string;
    _count?: { messages: number };
}

export interface TicketMessage {
    id: string;
    ticketId: string;
    senderId: string;
    senderType: 'user' | 'admin';
    message: string;
    attachments?: string[];
    createdAt: string;
}

export interface CreateTicketPayload {
    subject: string;
    description: string;
    category: TicketCategory;
    priority?: TicketPriority;
}

export const supportService = {
    /**
     * GET /api/support/my-tickets
     * Fetch the authenticated user's own tickets.
     */
    getMyTickets: async (): Promise<ApiResponse<SupportTicket[]>> => {
        return apiClient.get<SupportTicket[]>('/support/my-tickets');
    },

    /**
     * GET /api/support/tickets/:id
     * Fetch a single ticket with all messages.
     */
    getTicketById: async (ticketId: string): Promise<ApiResponse<SupportTicket & { messages: TicketMessage[] }>> => {
        return apiClient.get(`/support/tickets/${ticketId}`);
    },

    /**
     * POST /api/support/tickets
     * Create a new support ticket. Backend auto-emails admin.
     */
    createTicket: async (data: CreateTicketPayload): Promise<ApiResponse<SupportTicket>> => {
        return apiClient.post<SupportTicket>('/support/tickets', data);
    },

    /**
     * POST /api/support/tickets/:id/messages
     * Send a reply message on an existing ticket.
     */
    sendMessage: async (ticketId: string, message: string): Promise<ApiResponse<TicketMessage>> => {
        return apiClient.post<TicketMessage>(`/support/tickets/${ticketId}/messages`, { message });
    },
};
