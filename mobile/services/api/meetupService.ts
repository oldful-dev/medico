import { apiClient } from './apiClient';
import type { ApiResponse } from './apiClient';

export interface Meetup {
    id: string;
    title: string;
    description?: string;
    venue: string;
    venueAddress?: string;
    city: string;
    pinCode?: string;
    eventDate: string;
    startTime: string;
    endTime?: string;
    capacity: number;
    serviceCharge: number;
    isActive: boolean;
    isFeatured: boolean;
    organizerName?: string;
    organizerContact?: string;
    includedItems: string[];
    extraCharges: string[];
    imageUrl?: string;
    registeredCount: number;
    availableSeats: number;
    createdAt: string;
    updatedAt: string;
}

export interface MeetupRegistration {
    id: string;
    meetupId: string;
    userId: string;
    bookingCode: string;
    fullName: string;
    mobile: string;
    age: number;
    gender: string;
    assistanceJson?: any;
    specialNotes?: string;
    pickupEnabled: boolean;
    pickupAddress?: string;
    pickupLandmark?: string;
    pickupContact?: string;
    preferredPickupTime?: string;
    status: 'CONFIRMED' | 'PENDING' | 'ATTENDED' | 'CANCELLED';
    paymentStatus: string;
    amountPaid: number;
    createdAt: string;
    updatedAt: string;
    meetup?: Meetup;
}

export interface RegisterMeetupPayload {
    fullName: string;
    mobile: string;
    age: string;
    gender: string;
    assistanceJson?: Record<string, boolean>;
    specialNotes?: string;
    pickupEnabled?: boolean;
    pickupAddress?: string;
    pickupLandmark?: string;
    pickupContact?: string;
    preferredPickupTime?: string;
}

export const meetupService = {
    getMeetups: (params?: { city?: string; pinCode?: string; upcoming?: boolean }) => {
        const qs = new URLSearchParams();
        if (params?.city) qs.set('city', params.city);
        if (params?.pinCode) qs.set('pinCode', params.pinCode);
        if (params?.upcoming !== undefined) qs.set('upcoming', String(params.upcoming));
        const query = qs.toString() ? `?${qs.toString()}` : '';
        return apiClient.get<Meetup[]>(`/meetups${query}`);
    },

    getMeetupById: (id: string) =>
        apiClient.get<Meetup>(`/meetups/${id}`),

    getMyRegistrations: () =>
        apiClient.get<MeetupRegistration[]>('/meetups/my-registrations'),

    registerForMeetup: (meetupId: string, payload: RegisterMeetupPayload) =>
        apiClient.post<MeetupRegistration>(`/meetups/${meetupId}/register`, payload),

    cancelRegistration: (regId: string) =>
        apiClient.post<MeetupRegistration>(`/meetups/registrations/${regId}/cancel`, {}),

    getRegistrationById: (regId: string) =>
        apiClient.get<MeetupRegistration>(`/meetups/registrations/${regId}`),
};
