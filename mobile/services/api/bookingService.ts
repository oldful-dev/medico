// ──────────────────────────────────────────────
//  Booking Service — Wired to backend booking routes
//  POST   /api/bookings              (create booking)
//  GET    /api/bookings/history      (user's booking history)
//  POST   /api/bookings/:id/cancel   (cancel booking)
//  GET    /api/bookings/:id          (get single booking)
// ──────────────────────────────────────────────

import { apiClient, ApiResponse, PaginatedApiResponse } from './apiClient';
import { AnalyticsEvents } from '../firebase/analyticsEvents';

// ─── Types (aligned with Prisma Booking model) ──

export type BookingStatus =
    | 'PENDING'
    | 'ASSIGNED'
    | 'IN_PROGRESS'
    | 'COMPLETED'
    | 'CANCELLED'
    | 'SLA_BREACH';

export type ServiceType =
    | 'DOCTOR_HOME_VISIT'
    | 'HOSPITAL_TRIP'
    | 'HOME_NURSE'
    | 'INSURANCE'
    | 'BLOOD_TEST'
    | 'MEDICINES'
    | 'PHYSIO_FITNESS'
    | 'EQUIPMENT_RENTAL'
    | 'HOME_ESSENTIALS'
    | 'CLUB_EVENTS'
    | 'TIFFIN'
    | 'TECH_HELPER'
    | 'PAPERWORK_LEGAL'
    | 'BILL_PAYMENT'
    | 'CAB_DRIVING'
    | 'DEEP_CLEANING'
    | 'GROCERY'
    | 'BANK_PAPERWORK'
    | 'MEAL_SERVICE'
    | 'APPLIANCE_REPAIR'
    | 'PAPER_LEGAL'
    | 'MISC';

export type ShiftDuration = 'SHORT_VISIT' | 'TWELVE_HOUR' | 'TWENTY_FOUR_HOUR';

export interface CreateBookingPayload {
    serviceId: string;
    cityId: string;
    scheduledDate: string;       // ISO date string
    scheduledTime?: string;
    addressLine?: string;
    latitude?: number;
    longitude?: number;

    // Doctor Visit specific
    symptoms?: string[];
    doctorType?: string;         // general-physician, physiotherapist

    // Nurse Care specific
    staffType?: string;          // qualified-nurse, bedside-attendant
    shiftDuration?: ShiftDuration;
    startDate?: string;
    endDate?: string;
    requirements?: string[];

    // Transportation specific
    pickupAddress?: string;
    dropAddress?: string;
    vehicleType?: string;

    // Financial
    amount?: number;
    paymentMethod?: string;

    // Dynamic form data
    formDataJson?: Record<string, any>;
    isPaidBooking?: boolean;
}

export interface Booking {
    id: string;
    bookingCode: string;
    userId: string;
    serviceId: string;
    cityId: string;
    caregiverId?: string;
    scheduledDate: string;
    scheduledTime?: string;
    addressLine?: string;
    symptoms?: string[];
    doctorType?: string;
    staffType?: string;
    shiftDuration?: ShiftDuration;
    amount: number;
    status: BookingStatus;
    isEscalated: boolean;
    isSLABreached: boolean;
    slaDeadline?: string;
    formDataJson?: any;
    createdAt: string;

    // Populated relations
    service?: { name: string; slug: string; icon?: string; serviceType?: string };
    caregiver?: { name: string; phone: string; profileImageUrl?: string };
    payments?: Array<{ status: string; amount: number }>;
}

// ─── Service ──────────────────────────────────

export const bookingService = {
    /**
     * POST /api/bookings
     * Creates a new booking for any service type.
     */
    createBooking: async (data: CreateBookingPayload): Promise<ApiResponse<Booking>> => {
        const response = await apiClient.post<Booking>('/bookings', data);
        if (response.success && response.data) {
            AnalyticsEvents.trackBookingCompleted(
                response.data.service?.name || 'unknown',
                response.data.bookingCode
            );
        }
        return response;
    },

    /**
     * GET /api/bookings/history
     * Fetch authenticated user's booking history.
     */
    getMyBookings: async (): Promise<ApiResponse<Booking[]>> => {
        return apiClient.get<Booking[]>('/bookings/history');
    },

    /**
     * GET /api/bookings/:id
     * Fetch a single booking by ID.
     */
    getBookingById: async (bookingId: string): Promise<ApiResponse<Booking>> => {
        return apiClient.get<Booking>(`/bookings/detail/${bookingId}`);
    },

    /**
     * GET /api/bookings/:id
     * Fetch a single booking's details.
     */
    getBookingDetails: async (bookingId: string): Promise<ApiResponse> => {
        return apiClient.get(`/bookings/${bookingId}`);
    },

    /**
     * POST /api/bookings/:id/cancel
     * Cancel an active booking.
     */
    cancelBooking: async (bookingId: string): Promise<ApiResponse> => {
        AnalyticsEvents.trackBookingCancelled(bookingId);
        return apiClient.post(`/bookings/${bookingId}/cancel`);
    },
};
