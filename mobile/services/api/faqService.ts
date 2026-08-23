// ──────────────────────────────────────────────
//  FAQ Service
//  GET /api/faqs/published  (public, no auth token needed)
// ──────────────────────────────────────────────

import { apiClient, ApiResponse } from './apiClient';

export interface FAQItem {
    id: string;
    question: string;
    answer: string;
    category: string;
    order: number;
    isActive: boolean;
}

export const faqService = {
    getPublished: async (): Promise<ApiResponse<FAQItem[]>> => {
        return apiClient.get<FAQItem[]>('/faqs/published');
    },
};
