import { apiClient, ApiResponse } from './apiClient';
import { Booking } from './userService';

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
    createBooking: async (data: CreateBookingData): Promise<ApiResponse<Booking>> => {
        return apiClient.post<Booking>('/bookings', data);
    },

    getMyBookings: async (page = 1, limit = 10): Promise<ApiResponse<Booking[]>> => {
        return apiClient.get<Booking[]>(`/bookings/history?page=${page}&limit=${limit}`);
    },

    getBookingById: async (id: string): Promise<ApiResponse<Booking>> => {
        return apiClient.get<Booking>(`/bookings/detail/${id}`);
    },

    cancelBooking: async (id: string): Promise<ApiResponse<null>> => {
        return apiClient.post<null>(`/bookings/${id}/cancel`, {});
    },

    downloadInvoice: async (id: string): Promise<Blob> => {
        return apiClient.download(`/bookings/${id}/invoice`);
    }
};
