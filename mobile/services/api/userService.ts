// ──────────────────────────────────────────────
//  User Service — Wired to backend user routes
//  GET    /api/users/profile
//  PUT    /api/users/profile
//  POST   /api/users                   (create new user post-OTP)
//  POST   /api/users/:id/emergency-contacts
//  DELETE /api/users/:userId/emergency-contacts/:contactId
//  POST   /api/users/:id/addresses
//  PUT    /api/users/:userId/addresses/:addressId
//  POST   /api/users/:id/medical-card
//  POST   /api/users/:id/health-reports
// ──────────────────────────────────────────────

import { apiClient, ApiResponse } from './apiClient';

// ─── Types (aligned with Prisma schema) ───────

export interface UserProfile {
    id: string;
    uniqueUserId: string;
    name: string;
    phone: string;
    email?: string;
    gender?: string;
    dateOfBirth?: string;
    profileImageUrl?: string;
    preferredLanguage: string;
    healthTag: string;
    status: string;
    cityId: string;

    // Notification Preferences
    pushEnabled?: boolean;
    smsEnabled?: boolean;
    whatsappEnabled?: boolean;
    emailMarketingEnabled?: boolean;

    addresses?: Address[];
    emergencyContacts?: EmergencyContact[];
    medicalCards?: MedicalCard[];
    subscriptions?: any[];
}

export interface CreateUserPayload {
    name: string;
    phone: string;
    gender?: string;
    dateOfBirth?: string;
    email?: string;
    cityId: string;
    preferredLanguage?: string;
}

export interface Address {
    id?: string;
    label: string;       // Home, Office, etc.
    line1: string;
    line2?: string;
    cityName: string;
    state: string;
    pincode: string;
    landmark?: string;
    latitude?: number;
    longitude?: number;
    isDefault?: boolean;
}

export interface EmergencyContact {
    id?: string;
    name: string;
    phone: string;
    relationship: string;
}

export interface MedicalCard {
    id?: string;
    bloodGroup?: string;
    allergies: string[];
    chronicConditions: string[];
    currentMedications: string[];
}

export interface HealthReportUploadResult {
    id: string;
    title: string;
    fileUrl: string;
    fileType: string;
}

// ─── Service ──────────────────────────────────

export const userService = {
    /**
     * GET /api/users/profile
     * Fetch the authenticated user's profile.
     */
    getProfile: async (): Promise<ApiResponse<UserProfile>> => {
        return apiClient.get<UserProfile>('/users/profile');
    },

    /**
     * PUT /api/users/profile
     * Update the authenticated user's profile fields.
     */
    updateProfile: async (data: Partial<UserProfile>): Promise<ApiResponse<UserProfile>> => {
        return apiClient.put<UserProfile>('/users/profile', data);
    },

    /**
     * POST /api/users
     * Called after OTP verification for new users to complete registration.
     */
    createUser: async (data: CreateUserPayload): Promise<ApiResponse<UserProfile>> => {
        const response = await apiClient.post<UserProfile & { accessToken?: string; refreshToken?: string }>('/users', data);
        if (response.success && response.data) {
            if (response.data.accessToken) {
                apiClient.setAuthToken(response.data.accessToken);
            }
            if (response.data.refreshToken) {
                apiClient.setRefreshToken(response.data.refreshToken);
            }
        }
        return response as ApiResponse<UserProfile>;
    },

    // ─── Emergency Contacts ──────────────────────
    addEmergencyContact: async (userId: string, contact: Omit<EmergencyContact, 'id'>): Promise<ApiResponse<EmergencyContact>> => {
        return apiClient.post<EmergencyContact>(`/users/${userId}/emergency-contacts`, contact);
    },

    removeEmergencyContact: async (userId: string, contactId: string): Promise<ApiResponse> => {
        return apiClient.delete(`/users/${userId}/emergency-contacts/${contactId}`);
    },

    // ─── Addresses ───────────────────────────────
    addAddress: async (userId: string, address: Omit<Address, 'id'>): Promise<ApiResponse<Address>> => {
        return apiClient.post<Address>(`/users/${userId}/addresses`, address);
    },

    updateAddress: async (userId: string, addressId: string, address: Partial<Address>): Promise<ApiResponse<Address>> => {
        return apiClient.put<Address>(`/users/${userId}/addresses/${addressId}`, address);
    },

    // ─── Medical Card ────────────────────────────
    upsertMedicalCard: async (userId: string, data: Omit<MedicalCard, 'id'>): Promise<ApiResponse<MedicalCard>> => {
        return apiClient.post<MedicalCard>(`/users/${userId}/medical-card`, data);
    },

    // ─── Health Reports ──────────────────────────
    uploadHealthReport: async (userId: string, file: any, title: string): Promise<ApiResponse<HealthReportUploadResult>> => {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('title', title);
        return apiClient.upload<HealthReportUploadResult>(`/users/${userId}/health-reports`, formData);
    },

    getMyHealthReports: async (): Promise<ApiResponse<any[]>> => {
        return apiClient.get<any[]>('/users/profile/health-reports');
    },

    // ─── Profile Avatar ─────────────────────────
    uploadProfileAvatar: async (file: any): Promise<ApiResponse<UserProfile>> => {
        const formData = new FormData();
        formData.append('avatar', file);
        return apiClient.request<UserProfile>({ method: 'PUT', endpoint: '/users/profile/avatar', body: formData, isFormData: true, timeout: 60000 });
    },
};
