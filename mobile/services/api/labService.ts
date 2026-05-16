import { apiClient } from './apiClient';

export interface LabPackage {
    code: string;
    name: string;
    cost: number;
    discounted_cost?: number;
    fasting: boolean;
    tests_count?: number;
    type?: string;
}

export interface LabSlot {
    slot_id: number;
    slot: string;
    slot_time?: string;
}

export interface LabBookingPayload {
    bookingType: 'HOME';
    patient: {
        name: string;
        age: number;
        gender: string;
        phone: string;
    };
    address: {
        lat: string;
        long: string;
        pincode: string;
        line1: string;
    };
    packages: Array<{
        code: string;
        name: string;
        cost: number;
    }>;
    slot: {
        date: string;
        time: string;
        slotId: number;
    };
}

export interface LabBookingResponse {
    order?: {
        redcliffeBookingId: string;
        clientRefId: string;
    };
}

export const labService = {
    getPackages: async (search = '') => {
        const response = await apiClient.get<LabPackage[]>(`/labs/packages?search=${search}`);
        return response.data;
    },

    checkServiceability: async (lat: string, lng: string) => {
        const response = await apiClient.get<{ status: string; message: string }>(`/labs/serviceability?lat=${lat}&lng=${lng}`);
        return response.data;
    },

    getTimeSlots: async (date: string, lat?: string, lng?: string) => {
        const response = await apiClient.get<LabSlot[]>(`/labs/time-slots?date=${date}&lat=${lat}&lng=${lng}`);
        return response.data;
    },

    holdBooking: async (payload: LabBookingPayload) => {
        const response = await apiClient.post<LabBookingResponse>('/labs/book/hold', payload);
        return response.data;
    },

    searchLocation: async (q: string) => {
        const response = await apiClient.get(`/labs/location?search=${q}`);
        return response.data;
    }
};
