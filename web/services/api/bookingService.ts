import { apiClient, ApiResponse } from './apiClient';

export interface CreateBookingData {
    serviceId: string;
    scheduledDate: string;
    scheduledTime?: string;
    addressLine?: string;
    amount?: number;
    formDataJson?: Record<string, unknown>;
    // Add other optional fields supported by the backend
    symptoms?: string[];
    doctorType?: string;
    staffType?: string;
    shiftDuration?: string;
    startDate?: string;
    endDate?: string;
    requirements?: string[];
    pickupAddress?: string;
    dropAddress?: string;
    vehicleType?: string;
    paymentMethod?: string;
}

export const bookingService = {
    createBooking: async (data: CreateBookingData): Promise<ApiResponse> => {
        return apiClient.post('/bookings', data);
    },

    getMyBookings: async (page = 1, limit = 10): Promise<ApiResponse> => {
        return apiClient.get(`/bookings/history?page=${page}&limit=${limit}`);
    },

    getBookingById: async (id: string): Promise<ApiResponse> => {
        return apiClient.get(`/bookings/detail/${id}`);
    },

    cancelBooking: async (id: string): Promise<ApiResponse> => {
        return apiClient.post(`/bookings/${id}/cancel`);
    },

    downloadInvoice: async (id: string): Promise<Blob> => {
        return apiClient.download(`/bookings/${id}/invoice`);
    }
};
