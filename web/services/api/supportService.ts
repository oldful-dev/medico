import { apiClient, ApiResponse } from './apiClient';

export type TicketStatus = 'open' | 'in_progress' | 'resolved' | 'closed';
export type TicketCategory = 'billing' | 'service' | 'complaint' | 'lab' | 'technical' | 'other';

export interface SupportTicket {
    id: string;
    ticketCode: string;
    subject: string;
    description: string;
    status: TicketStatus;
    category: TicketCategory;
    createdAt: string;
    updatedAt: string;
    _count?: {
        messages: number;
    };
}

export interface TicketMessage {
    id: string;
    message: string;
    senderType: 'user' | 'admin';
    createdAt: string;
}

export const supportService = {
    getMyTickets: (): Promise<ApiResponse<SupportTicket[]>> =>
        apiClient.get<SupportTicket[]>('/support/my-tickets'),

    createTicket: (data: { subject: string; description: string; category: TicketCategory }): Promise<ApiResponse<SupportTicket>> =>
        apiClient.post<SupportTicket>('/support/tickets', data),

    getTicketById: (id: string): Promise<ApiResponse<SupportTicket & { messages: TicketMessage[] }>> =>
        apiClient.get<SupportTicket & { messages: TicketMessage[] }>(`/support/tickets/${id}`),

    addMessage: (id: string, text: string): Promise<ApiResponse<TicketMessage>> =>
        apiClient.post<TicketMessage>(`/support/tickets/${id}/messages`, { message: text }),

    subscribe: (email: string): Promise<ApiResponse<null>> =>
        apiClient.post<null>('/support/subscribe', { email }),
};
