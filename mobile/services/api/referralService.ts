// ──────────────────────────────────────────────
//  Referral Service
//  GET /api/referrals/me         — my code, stats, referred users
//  GET /api/referrals/validate   — pre-check a code entered at signup
// ──────────────────────────────────────────────

import { apiClient, ApiResponse } from './apiClient';

export type ReferralStatus = 'PENDING' | 'QUALIFIED' | 'REWARDED' | 'VOID';

export interface ReferralRewardCoupon {
    id: string;
    code: string;
    discountValue: number;
    discountType: 'flat' | 'percentage';
    validUntil?: string | null;
    usedCount: number;
    isActive: boolean;
}

export interface ReferralEntry {
    id: string;
    refereeName: string;
    status: ReferralStatus;
    rewardValue: number;
    createdAt: string;
    rewardedAt?: string | null;
    rewardCoupon?: ReferralRewardCoupon | null;
}

export interface MyReferral {
    referralCode: string;
    welcomeCoupon?: {
        code: string;
        discountValue: number;
        discountType: 'flat' | 'percentage';
        validUntil?: string | null;
        usedCount: number;
        isActive: boolean;
    } | null;
    program: {
        enabled: boolean;
        referrerRewardValue: number;
        refereeRewardValue: number;
        discountType: 'flat' | 'percentage';
        maxRewardsPerReferrer: number;
        rewardValidityDays: number;
    };
    stats: {
        total: number;
        rewarded: number;
        pending: number;
        totalEarned: number;
        slotsLeft: number;
    };
    referrals: ReferralEntry[];
}

export interface CodeValidation {
    valid: boolean;
    reason?: string;
    referrerName?: string;
    refereeReward?: number;
    discountType?: 'flat' | 'percentage';
}

export const referralService = {
    getMine: async (): Promise<ApiResponse<MyReferral>> =>
        apiClient.get<MyReferral>('/referrals/me'),

    validateCode: async (code: string): Promise<ApiResponse<CodeValidation>> =>
        apiClient.get<CodeValidation>(`/referrals/validate?code=${encodeURIComponent(code.trim())}`),
};
