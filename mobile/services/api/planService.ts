// ──────────────────────────────────────────────
//  Plan Service — Wired to backend plan routes
//  GET /api/plans           (list all plans)
//  GET /api/plans/:id       (get plan details)
// ──────────────────────────────────────────────

import { apiClient, ApiResponse } from './apiClient';

// ─── Types (aligned with Prisma Plan model) ─────

export interface Plan {
    id: string;
    name: string;             // Basic Care, Care Plus, Premium Care
    description?: string;
    benefits?: string;
    quarterlyPrice: number;
    biannualPrice: number;
    yearlyPrice: number;
    isVisible: boolean;
    sortOrder: number;
}

// ─── Service ──────────────────────────────────

export const planService = {
    /**
     * GET /api/plans
     * Fetch all visible subscription plans.
     */
    getPlans: async (): Promise<ApiResponse<Plan[]>> => {
        return apiClient.get<Plan[]>('/plans');
    },

    /**
     * GET /api/plans/:id
     * Fetch a single plan by ID.
     */
    getPlanById: async (planId: string): Promise<ApiResponse<Plan>> => {
        return apiClient.get<Plan>(`/plans/${planId}`);
    },
};
