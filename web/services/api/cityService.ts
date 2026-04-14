import { apiClient, ApiResponse } from './apiClient';

export interface City {
    id: string;
    name: string;
    code: string;             // BLR, HYD
    stateCode: string;        // KA-29
    isEnabled: boolean;
    isComingSoon: boolean;
}

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
