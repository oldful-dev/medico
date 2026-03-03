// ──────────────────────────────────────────────
//  Service Catalog Service — Wired to backend
//  GET /api/services           (list all services)
//  GET /api/services/:id       (get service details)
// ──────────────────────────────────────────────

import { apiClient, ApiResponse } from './apiClient';

// ─── Types (aligned with Prisma Service model) ──

export interface ServiceItem {
    id: string;
    name: string;
    slug: string;
    icon?: string;
    tagline?: string;
    description?: string;
    pricingText?: string;     // "₹799 / visit"
    heroImageUrl?: string;
    route?: string;           // /services/doctor-visit
    sortOrder: number;
    isEnabled: boolean;
    serviceType: string;
    formFieldsJson?: Record<string, any>;  // dynamic form field config
}

// ─── Service ──────────────────────────────────

export const serviceCatalogService = {
    /**
     * GET /api/services
     * Fetch all enabled services for the app.
     */
    getServices: async (): Promise<ApiResponse<ServiceItem[]>> => {
        return apiClient.get<ServiceItem[]>('/services');
    },

    /**
     * GET /api/services/:id
     * Fetch single service detail with form field config.
     */
    getServiceById: async (serviceId: string): Promise<ApiResponse<ServiceItem>> => {
        return apiClient.get<ServiceItem>(`/services/${serviceId}`);
    },
};
