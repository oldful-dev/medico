// ──────────────────────────────────────────────
//  Legal Service — T&C, Privacy, Legal docs
//  GET /api/legal/published/:type
// ──────────────────────────────────────────────

import { apiClient, ApiResponse } from './apiClient';

// ─── Types (aligned with Prisma LegalDocument) ──

export type LegalDocType = string;

export interface LegalDocument {
    id: string;
    type: LegalDocType;
    title: string;
    content: string;          // HTML or Markdown
    version: number;
    status: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
    publishedAt?: string;
    createdAt: string;
    updatedAt: string;
}

// ─── Service ──────────────────────────────────

export const legalService = {
    /**
     * GET /api/legal/published
     * Fetch all published legal documents.
     */
    getPublishedDocuments: async (): Promise<ApiResponse<LegalDocument[]>> => {
        return apiClient.get<LegalDocument[]>('/legal/published');
    },

    /**
     * GET /api/legal/published/:type
     * Fetch the published version of a legal document.
     */
    getPublishedDocument: async (type: LegalDocType): Promise<ApiResponse<LegalDocument>> => {
        return apiClient.get<LegalDocument>(`/legal/published/${type}`);
    },

    getTermsAndConditions: async (): Promise<ApiResponse<LegalDocument>> => {
        return legalService.getPublishedDocument('TERMS_AND_CONDITIONS');
    },

    getPrivacyPolicy: async (): Promise<ApiResponse<LegalDocument>> => {
        return legalService.getPublishedDocument('PRIVACY_POLICY');
    },

    getRefundPolicy: async (): Promise<ApiResponse<LegalDocument>> => {
        return legalService.getPublishedDocument('REFUND_POLICY');
    },

    getDisclaimer: async (): Promise<ApiResponse<LegalDocument>> => {
        return legalService.getPublishedDocument('DISCLAIMER');
    },

    getServicePolicy: async (): Promise<ApiResponse<LegalDocument>> => {
        return legalService.getPublishedDocument('SERVICE_POLICY');
    },

    getStatutoryDisclosures: async (): Promise<ApiResponse<LegalDocument>> => {
        return legalService.getPublishedDocument('STATUTORY_DISCLOSURES');
    },

    getCookiePolicy: async (): Promise<ApiResponse<LegalDocument>> => {
        return legalService.getPublishedDocument('COOKIE_POLICY');
    },
};
