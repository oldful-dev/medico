import { apiClient } from './apiClient';

export interface LabPackage {
    code: string;
    name: string;
    cost: number;
    discounted_cost?: number;
    fasting: boolean;
    tests_count?: number;
}

export interface LabSlot {
    slot_id: number;
    slot: string;
    slot_time?: string;
}

export const labService = {
    getPackages: async (search = '') => {
        const response = await apiClient.get<LabPackage[]>(`/labs/packages?search=${search}`);
        return response.data;
    },

    getTimeSlots: async (date: string, lat?: string, lng?: string) => {
        const response = await apiClient.get<LabSlot[]>(`/labs/time-slots?date=${date}&lat=${lat}&lng=${lng}`);
        return response.data;
    },

    searchLocation: async (q: string) => {
        const response = await apiClient.get(`/labs/location?search=${q}`);
        return response.data;
    }
};
