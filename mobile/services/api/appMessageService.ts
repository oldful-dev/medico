// ──────────────────────────────────────────────
//  App Message Service — spec 6.2/6.3/6.4 "Wish & Information"
//  GET  /api/app-messages/active        (the active popup for this user, dismissal-aware)
//  POST /api/app-messages/:id/dismiss   (Dismiss — re-shown after 24h, then never)
//  POST /api/app-messages/:id/acknowledge (OK / Agree — never shown again)
// ──────────────────────────────────────────────

import { apiClient, ApiResponse } from './apiClient';

export interface AppMessage {
    id: string;
    title: string;
    body: string;
    type: string;
    imageUrl?: string | null;
    isActive: boolean;
    requiresAgreement: boolean;
    version: string;
}

export const appMessageService = {
    getActive: async (): Promise<ApiResponse<AppMessage | null>> => {
        return apiClient.get<AppMessage | null>('/app-messages/active');
    },
    dismiss: async (id: string): Promise<ApiResponse<any>> => {
        return apiClient.post(`/app-messages/${id}/dismiss`);
    },
    acknowledge: async (id: string): Promise<ApiResponse<any>> => {
        return apiClient.post(`/app-messages/${id}/acknowledge`);
    },
};
