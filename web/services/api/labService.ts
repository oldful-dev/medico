import { apiClient, ApiResponse } from './apiClient';

export interface LabPackage {
    code: string;
    name: string;
    cost: number;
    discounted_cost?: number;
    fasting: boolean;
    tests_count?: number;
}

export interface TimeSlot {
    slot_id: number;
    slot: string;
}

export interface LabBookingStatus {
    data: unknown[];
    [key: string]: unknown;
}

export interface LabBookingResponse {
    order?: {
        redcliffeBookingId: string;
        clientRefId: string;
    };
}

export interface LabBookingPayload {
    bookingType: 'HOME' | 'DROP_OFF';
    patient: {
        name: string;
        age: number;
        gender: string;
        phone: string;
        email?: string;
    };
    additionalMembers?: Array<{
        name: string;
        age: number;
        gender: string;
        packages: Array<{ code: string }>;
    }>;
    address: {
        lat: string;
        long: string;
        pincode: string;
        line1: string;
        landmark?: string;
    };
    packages: Array<{ code: string; name: string; cost: number }>;
    slot: {
        date: string;
        time: string;
        slotId: number;
    };
}

export const labService = {
    searchPackages: async (query: string = ''): Promise<ApiResponse<LabPackage[]>> => {
        return apiClient.get<LabPackage[]>(`/labs/packages?search=${encodeURIComponent(query)}`);
    },

    getPackageDetails: async (code: string): Promise<ApiResponse<LabPackage>> => {
        return apiClient.get<LabPackage>(`/labs/packages/${code}`);
    },

    getTimeSlots: async (date: string, lat: string, lng: string): Promise<ApiResponse<TimeSlot[]>> => {
        return apiClient.get<TimeSlot[]>(`/labs/time-slots?date=${date}&lat=${lat}&lng=${lng}`);
    },

    holdBooking: async (payload: LabBookingPayload): Promise<ApiResponse<LabBookingResponse>> => {
        return apiClient.post<LabBookingResponse>('/labs/book/hold', payload);
    },

    getBookingStatus: async (bookingId: string): Promise<ApiResponse<LabBookingStatus>> => {
        return apiClient.get<LabBookingStatus>(`/labs/booking/${bookingId}`);
    },
    
    getDigitalReport: async (bookingId: string): Promise<ApiResponse<LabBookingStatus>> => {
        return apiClient.get<LabBookingStatus>(`/labs/booking/${bookingId}/digital-report`);
    },

    downloadReport: async (bookingId: string): Promise<Blob> => {
        return apiClient.download(`/labs/booking/${bookingId}/report`);
    }
};
