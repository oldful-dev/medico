import { apiClient } from './apiClient';

export interface LabPackage {
    code: string;
    name: string;
    cost: number;
    discounted_cost?: number;
    fasting: boolean;
    tests_count?: number;
    tests?: string[];
    preparation?: string;
    collectionType?: string;
    reportTime?: string;
    description?: string;
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
    id: string;
    clientRefId: string;
    redcliffeBookingId?: string;
    status: string;
    bookingType: string;
    patient: any;
    address: any;
    packages: any;
    slot: any;
    // ... other fields from labOrder
}

export interface LabOrderListItem {
    id: string;
    clientRefId: string;
    status: string;           // LabStatus enum: PENDING|HOLD_CREATED|CONFIRMED|RESCHEDULED|SAMPLE_COLLECTED|REPORT_GENERATED|FAILED
    bookingType: string;      // 'HOME' | 'DROP_OFF'
    patient: any;
    packages: any[];
    slot: { date: string; time: string };
    rescheduledDate?: string; // Admin-updated date if rescheduled
    rescheduledTime?: string; // Admin-updated time if rescheduled
    address: any;
    assignedStaff?: { name: string; staffId?: string; phone?: string; photoUrl?: string };
    reportUrl?: string;
    createdAt: string;
    payments?: Array<{ status: string; amount: number }>;
}

export const labService = {
    getPackages: async (search = '') => {
        const response = await apiClient.request<LabPackage[]>({
            method: 'GET',
            endpoint: `/labs/packages?search=${search}`,
            timeout: 15000
        });
        return response.data;
    },

    getPackageDetails: async (code: string) => {
        const response = await apiClient.request<LabPackage>({
            method: 'GET',
            endpoint: `/labs/packages/${code}`,
            timeout: 10000
        });
        return response.data;
    },

    getTimeSlots: async (date: string, lat?: string, lng?: string) => {
        const response = await apiClient.request<LabSlot[]>({
            method: 'GET',
            endpoint: `/labs/time-slots?date=${date}&lat=${lat}&lng=${lng}`,
            timeout: 30000 // Increased timeout for slots API (slower endpoint)
        });
        return response.data;
    },

    checkServiceability: async (lat: string, lng: string) => {
        const response = await apiClient.request({
            method: 'GET',
            endpoint: `/labs/serviceability?lat=${lat}&lng=${lng}`,
            timeout: 30000 // Increased timeout for serviceability check (slower endpoint)
        });
        return response.data;
    },

    holdBooking: async (payload: LabBookingPayload) => {
        const response = await apiClient.post<LabBookingResponse>('/labs/book/hold', payload);
        return response.data;
    },

    searchLocation: async (q: string) => {
        try {
            const response = await apiClient.get(`/labs/location?search=${encodeURIComponent(q)}`);
            return response.data || response;
        } catch (error) {
            console.error('searchLocation error:', error);
            throw error;
        }
    },

    // Redcliffe-specific APIs
    searchLocationByArea: async (areaName: string) => {
        // API #1: Get eloc (location code) by area name
        try {
            const response = await apiClient.request({
                method: 'GET',
                endpoint: `/labs/location/search?q=${encodeURIComponent(areaName)}`,
                timeout: 10000
            });
            console.log('searchLocationByArea raw response:', response);
            return response.data || response;
        } catch (error) {
            console.error('searchLocationByArea error:', error);
            throw error;
        }
    },

    getCoordinatesByEloc: async (eloc: string) => {
        // API #2: Get latitude/longitude from eloc
        try {
            const response = await apiClient.request({
                method: 'GET',
                endpoint: `/labs/location/eloc/${eloc}`,
                timeout: 10000
            });
            console.log('getCoordinatesByEloc raw response:', response);
            return response.data || response;
        } catch (error) {
            console.error('getCoordinatesByEloc error:', error);
            throw error;
        }
    },

    getUserLabOrders: async () => {
        const response = await apiClient.get<LabOrderListItem[]>('/labs/my-orders');
        return response;
    },

    getLabOrderById: async (id: string) => {
        const response = await apiClient.get<LabOrderListItem>(`/labs/booking/${id}`);
        return response;
    },

    cancelLabOrder: async (id: string) => {
        const response = await apiClient.post(`/labs/booking/${id}/cancel`, {});
        return response;
    }
};
