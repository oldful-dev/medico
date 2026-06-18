// ─────────────────────────────────────────────────────────────────────────────
//  Plan Service — Wired to backend plan routes
//  GET  /api/plans                  (list all plans)
//  GET  /api/plans/:id              (get plan details)
//  POST /api/subscriptions/initiate (start a subscription, returns subscriptionId)
// ─────────────────────────────────────────────────────────────────────────────

import { apiClient, ApiResponse } from './apiClient';

// ─── Types (aligned with Prisma Plan model) ─────────────

export interface Plan {
    id: string;
    name: string;             // Basic Care, Care Plus, Premium Care
    planType?: string;        // 'CARE', 'HOMEMAKER'
    tierLevel?: number;       // 0=Basic, 1=Premium, 2=VIP
    description?: string;
    benefits?: string;        // Free-text fallback description (admin-typed)
    quarterlyPrice: number;
    biannualPrice: number;
    yearlyPrice: number;
    isVisible: boolean;
    sortOrder: number;
    billingCycles?: PlanBillingCycle[];
    /** Structured benefit rows — the authoritative record of per-category counts.
     *  Returned by GET /api/plans/by-category/:planType.
     *  Use these to display feature lines when available; fall back to `benefits` text otherwise.
     */
    planBenefits?: PlanBenefit[];
}

export interface PlanBillingCycle {
    id: string;
    planId: string;
    durationMonths: number;
    price: number;
    discountPercentage: number;
}

/** V2 structured benefit row — maps one DB PlanBenefit row.
 *  `benefitCode` is the canonical identifier (e.g. SOS, TELECONSULT).
 *  Icons are mapped client-side from benefitCode — never stored in DB.
 */
export interface PlanBenefit {
    id: string;
    planId: string;
    benefitCode: string;   // SOS | TELECONSULT | MEDICINE | etc.
    title: string;         // Admin-configured display label
    description?: string;  // Optional subtitle
    usageLimit: number;    // 0 = unlimited; N = N uses per usagePeriod
    usagePeriod: string;   // MONTH | QUARTER | YEAR
    displayOrder: number;
    // legacy fields (kept for compat with old rows)
    serviceCategory?: string;
    freeCount?: number;
}

export type BillingCycle = 'QUARTERLY' | 'BIANNUAL' | 'YEARLY' | 'MONTHLY';

export interface ActiveSubscription {
    id: string;
    planId: string;
    planName: string;
    planType?: string;
    tierLevel?: number;
    expiryDate: string;
    autoRenew: boolean;
    daysRemaining?: number;
    status?: string;
    amount?: number;
    billingCycle?: BillingCycle;
    scheduledDowngrade?: {
        planId: string;
        planName: string;
        activatesOn: string;
    } | null;
}

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

export interface UpgradeCalculation {
    currentSubId: string;
    currentPlan: { id: string; name: string; price: number };
    newPlan: { id: string; name: string; price: number };
    calculation: {
        daysTotal: number;
        daysRemaining: number;
        dailyRate: number;
        creditAmount: number;
        newPlanPrice: number;
        amountDue: number;
        paymentRequired: boolean;
    };
}

export interface UpgradeHistoryItem {
    id: string;
    oldPlanId: string;
    newPlanId: string;
    oldPlanName: string;
    newPlanName: string;
    oldPrice: number;
    newPrice: number;
    remainingDays: number;
    creditApplied: number;
    amountPaid: number;
    type: string; // UPGRADE | DOWNGRADE_SCHEDULED | RENEW
    upgradeDate: string;
    createdAt: string;
    oldPlan?: { id: string; name: string; planType?: string; tierLevel?: number };
    newPlan?: { id: string; name: string; planType?: string; tierLevel?: number };
}

export interface MembershipsResponse {
    memberships: Record<string, ActiveSubscription[]>; // keyed by planType
    categories: string[];
}

// ─── Service ─────────────────────────────────────────────────────────────────

export const planService = {
    /**
     * GET /api/plans
     * Fetch all visible subscription plans.
     */
    getPlans: async (): Promise<ApiResponse<Plan[]>> => {
        return apiClient.get<Plan[]>('/plans');
    },

    /**
     * GET /api/plans/by-category/:planType
     * Fetch all visible plans of a specific type (CARE or HOMEMAKER), ordered by tierLevel asc.
     * Used by SubscriptionUpsellBanner to display the right plans for a given service.
     */
    getPlansByType: async (planType: 'CARE' | 'HOMEMAKER'): Promise<ApiResponse<Plan[]>> => {
        return apiClient.get<Plan[]>(`/plans/by-category/${planType}`);
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
     */
    checkActiveSubscription: async (): Promise<ApiResponse<any>> => {
        return apiClient.get('/subscriptions/me/active');
    },

    /**
     * GET /api/subscriptions/me/memberships
     * Returns all active subscriptions grouped by category (CARE, HOMEMAKER).
     */
    getMemberships: async (): Promise<ApiResponse<MembershipsResponse>> => {
        return apiClient.get<MembershipsResponse>('/subscriptions/me/memberships');
    },

    /**
     * GET /api/subscriptions/:id/available-upgrades
     * Returns plans in same category with higher tier level.
     */
    getAvailableUpgrades: async (subId: string): Promise<ApiResponse<{ currentPlan: Plan; availableUpgrades: Plan[] }>> => {
        return apiClient.get(`/subscriptions/${subId}/available-upgrades`);
    },

    /**
     * POST /api/subscriptions/:id/calculate-upgrade
     * Preview pro-rata credit calculation before upgrading.
     */
    calculateUpgrade: async (
        subId: string,
        newPlanId: string,
        newBillingCycle: BillingCycle
    ): Promise<ApiResponse<UpgradeCalculation>> => {
        return apiClient.post<UpgradeCalculation>(`/subscriptions/${subId}/calculate-upgrade`, {
            newPlanId,
            newBillingCycle,
        });
    },

    /**
     * POST /api/subscriptions/:id/upgrade
     * Execute the upgrade instantly. Pass payment details if amountDue > 0.
     */
    executeUpgrade: async (
        subId: string,
        payload: {
            newPlanId: string;
            newBillingCycle: BillingCycle;
            razorpayPaymentId?: string;
            razorpayOrderId?: string;
            razorpaySignature?: string;
        }
    ): Promise<ApiResponse<any>> => {
        return apiClient.post(`/subscriptions/${subId}/upgrade`, payload);
    },

    /**
     * GET /api/subscriptions/me/upgrade-history
     * Returns the full upgrade / downgrade / renew history for the user.
     */
    getUpgradeHistory: async (): Promise<ApiResponse<UpgradeHistoryItem[]>> => {
        return apiClient.get<UpgradeHistoryItem[]>('/subscriptions/me/upgrade-history');
    },

    /**
     * PUT /api/subscriptions/:id/cancel
     * Cancel an active subscription — backend fires PLAN_CANCELLED_WITH_CONTACT SMS.
     */
    cancelSubscription: async (subscriptionId: string): Promise<ApiResponse<any>> => {
        return apiClient.put(`/subscriptions/${subscriptionId}/cancel`);
    },
};

// ─── Legal document service (for T&C) ────────────────────────────────────────
export const legalService = {
    /**
     * GET /api/legal?type=SUBSCRIPTION_TERMS
     * Fetches the published subscription terms & conditions from LegalDocument table.
     * Returns null if not found.
     */
    getSubscriptionTerms: async (): Promise<ApiResponse<{ content: string; title: string } | null>> => {
        return apiClient.get('/legal?type=SUBSCRIPTION_TERMS');
    },
};
