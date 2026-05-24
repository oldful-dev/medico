// ──────────────────────────────────────────────
//  Plan Service — Wired to backend plan routes
//  GET  /api/plans                  (list all plans)
//  GET  /api/plans/:id              (get plan details)
//  POST /api/subscriptions/initiate (start a subscription, returns subscriptionId)
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

export type BillingCycle = 'QUARTERLY' | 'BIANNUAL' | 'YEARLY';

export interface InitiateSubscriptionPayload {
    planId: string;
    billingCycle: BillingCycle;
    amount: number;
}

export interface InitiateSubscriptionResponse {
    id: string;         // subscriptionId to pass to payment/checkout
    planId: string;
    billingCycle: BillingCycle;
    amount: number;
    status: string;     // PAYMENT_PENDING
    expiryDate: string;
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

    /**
     * POST /api/subscriptions/initiate
     * Creates a PAYMENT_PENDING subscription record and returns its ID.
     * Pass the returned subscriptionId to payment/checkout to open Razorpay.
     */
    initiateSubscription: async (
        data: InitiateSubscriptionPayload
    ): Promise<ApiResponse<InitiateSubscriptionResponse>> => {
        return apiClient.post<InitiateSubscriptionResponse>('/subscriptions/initiate', data);
    },

    /**
     * GET /api/subscriptions/me/active
     * Check if user has an active subscription.
     * Returns subscription details if active, or hasActiveSubscription: false if not.
     */
    checkActiveSubscription: async (): Promise<ApiResponse<any>> => {
        return apiClient.get('/subscriptions/me/active');
    },

    /**
     * PUT /api/subscriptions/:id/cancel
     * Cancel an active subscription — backend fires PLAN_CANCELLED_WITH_CONTACT SMS (215602).
     */
    cancelSubscription: async (subscriptionId: string): Promise<ApiResponse<any>> => {
        return apiClient.put(`/subscriptions/${subscriptionId}/cancel`);
    },
};
