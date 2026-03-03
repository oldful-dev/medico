// ──────────────────────────────────────────────
//  City Service — Wired to backend city routes
//  GET /api/cities           (list all cities)
//  GET /api/cities/:id       (get city details)
// ──────────────────────────────────────────────

import { apiClient, ApiResponse } from './apiClient';

// ─── Types (aligned with Prisma City model) ─────

export interface City {
    id: string;
    name: string;
    code: string;             // BLR, HYD
    stateCode: string;        // KA-29
    isEnabled: boolean;
    isComingSoon: boolean;
}

// ─── Service ──────────────────────────────────

export const cityService = {
    /**
     * GET /api/cities
     * Fetch all cities (enabled + coming soon).
     */
    getCities: async (): Promise<ApiResponse<City[]>> => {
        return apiClient.get<City[]>('/cities');
    },

    /**
     * GET /api/cities/:id
     * Fetch a single city by ID.
     */
    getCityById: async (cityId: string): Promise<ApiResponse<City>> => {
        return apiClient.get<City>(`/cities/${cityId}`);
    },
};
