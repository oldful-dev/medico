// ──────────────────────────────────────────────
//  Insurance Service — Wired to backend insurance routes
//  POST   /api/insurance               (submit application)
//  GET    /api/insurance                (list applications — admin)
//  GET    /api/insurance/:id            (get application status)
//  PUT    /api/insurance/:id/status     (update status — admin)
// ──────────────────────────────────────────────

import { apiClient, ApiResponse } from './apiClient';

// ─── Types (aligned with Prisma schema) ───────

export type InsuranceAppStatus = 'DRAFT' | 'SUBMITTED' | 'UNDER_REVIEW' | 'APPROVED' | 'REJECTED';

export interface InsuranceApplication {
    id: string;
    userId: string;
    planName: string;
    applicantName: string;
    applicantAge: number;
    applicantGender: string;
    preExistingConditions: string[];
    documentsJson?: { name: string; url: string }[];
    premium: number;
    status: InsuranceAppStatus;
    reviewNotes?: string;
    createdAt: string;
    updatedAt: string;
}

export interface SubmitInsurancePayload {
    planName: string;
    applicantName: string;
    applicantAge: number;
    applicantGender: string;
    preExistingConditions: string[];
    documents?: { name: string; url: string }[];
    premium?: number;
}

// ─── Service ──────────────────────────────────

export const insuranceService = {
    /**
     * POST /api/insurance
     * Submit a new insurance application.
     */
    submitApplication: async (data: SubmitInsurancePayload): Promise<ApiResponse<InsuranceApplication>> => {
        return apiClient.post<InsuranceApplication>('/insurance', data);
    },

    /**
     * GET /api/insurance/:id
     * Get application details and status.
     */
    getApplicationStatus: async (applicationId: string): Promise<ApiResponse<InsuranceApplication>> => {
        return apiClient.get<InsuranceApplication>(`/insurance/${applicationId}`);
    },
};
