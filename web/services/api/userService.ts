import { apiClient, ApiResponse } from './apiClient';

// ─── Types matching backend Prisma schema ──────────────────────────────────

export interface UserProfile {
    id: string;
    uniqueUserId: string;
    name: string;
    phone: string;
    email?: string;
    gender?: string;
    dateOfBirth?: string;
    profileImageUrl?: string;
    preferredLanguage?: string;
    healthTag?: string;
    city?: { name: string; code: string };
    
    // Notification Preferences
    pushEnabled?: boolean;
    smsEnabled?: boolean;
    whatsappEnabled?: boolean;
    emailMarketingEnabled?: boolean;

    addresses: Address[];
    emergencyContacts: EmergencyContact[];
    medicalCards: MedicalCard[];
    healthReports: HealthReport[];
    subscriptions: Subscription[];
}

export interface Address {
    id: string;
    label?: string;
    line1: string;
    line2?: string;
    landmark?: string;
    pincode?: string;
    cityName?: string;
    state?: string;
    isDefault?: boolean;
}

export interface EmergencyContact {
    id: string;
    name: string;
    phone: string;
    relationship?: string;
}

export interface MedicalCard {
    id: string;
    bloodGroup?: string;
    allergies?: string[];
    chronicConditions?: string[];
    currentMedications?: string[];
    lastUpdated?: string;
}

export interface HealthReport {
    id: string;
    title: string;
    fileUrl: string;
    fileType?: string;
    reportDate?: string;
    ocrStatus?: string;
    flagNote?: string;
    flagSeverity?: string;
    createdAt: string;
}

export interface Subscription {
    id: string;
    status: string;
    plan: { name: string; price?: number };
    startDate: string;
    expiryDate: string;
}

export interface PaymentInvoice {
    id: string;
    invoiceNumber: string;
    subtotal: number;
    gstRate: number;
    gstAmount: number;
    totalAmount: number;
    pdfUrl?: string;
}

export interface Payment {
    id: string;
    amount: number;
    status: string;
    razorpayOrderId?: string;
    razorpayPaymentId?: string;
    createdAt: string;
    invoice?: PaymentInvoice;
}

export interface Booking {
    id: string;
    bookingCode: string;
    service?: { name: string; slug: string; icon: string; pricingText: string };
    scheduledDate: string;
    scheduledTime?: string;
    status: string;
    amount: number;
    addressLine?: string;
    latitude?: number;
    longitude?: number;
    payments?: Payment[];
    formDataJson?: Record<string, unknown>;
    photos?: string[];          // From [id]/page.tsx
    attachments?: string[];     // From DoctorVisitForm.tsx
    createdAt: string;
}

// ─── User Service ──────────────────────────────────────────────────────────

export const userService = {
    // ── Profile ──
    // GET /users/profile — returns full profile incl. addresses, medicalCards etc.
    getProfile: (): Promise<ApiResponse<UserProfile>> =>
        apiClient.get<UserProfile>('/users/profile'),

    // PUT /users/profile — update name, email, gender, dateOfBirth, preferredLanguage
    updateProfile: (data: Partial<UserProfile>): Promise<ApiResponse<UserProfile>> =>
        apiClient.put<UserProfile>('/users/profile', data),

    // PUT /users/profile/avatar — multipart upload
    uploadAvatar: async (file: File): Promise<ApiResponse<UserProfile>> => {
        const form = new FormData();
        form.append('avatar', file);
        const res = await fetch(
            `${process.env.NEXT_PUBLIC_API_URL || 'https://api.ayuxacare.com/api'}/users/profile/avatar`,
            {
                method: 'PUT',
                headers: { Authorization: `Bearer ${apiClient.getToken()}` },
                body: form,
            }
        );
        return res.json();
    },

    // ── Addresses ──
    // POST /users/:id/addresses
    addAddress: (userId: string, data: Partial<Address>): Promise<ApiResponse<Address>> =>
        apiClient.post<Address>(`/users/${userId}/addresses`, data),

    // PUT /users/:userId/addresses/:addressId
    updateAddress: (userId: string, addressId: string, data: Partial<Address>): Promise<ApiResponse<Address>> =>
        apiClient.put<Address>(`/users/${userId}/addresses/${addressId}`, data),

    // DELETE /users/:userId/addresses/:addressId
    deleteAddress: (userId: string, addressId: string): Promise<ApiResponse<null>> =>
        apiClient.delete<null>(`/users/${userId}/addresses/${addressId}`),

    // ── Emergency Contacts ──
    // POST /users/:id/emergency-contacts
    addEmergencyContact: (userId: string, data: Omit<EmergencyContact, 'id'>): Promise<ApiResponse<EmergencyContact>> =>
        apiClient.post<EmergencyContact>(`/users/${userId}/emergency-contacts`, data),

    // DELETE /users/:userId/emergency-contacts/:contactId
    removeEmergencyContact: (userId: string, contactId: string): Promise<ApiResponse<null>> =>
        apiClient.delete<null>(`/users/${userId}/emergency-contacts/${contactId}`),

    // ── Medical Card ──
    // POST /users/:id/medical-card (upsert)
    upsertMedicalCard: (userId: string, data: Partial<MedicalCard>): Promise<ApiResponse<MedicalCard>> =>
        apiClient.post<MedicalCard>(`/users/${userId}/medical-card`, data),

    // ── Health Reports ──
    // GET /users/profile/health-reports
    getHealthReports: (): Promise<ApiResponse<HealthReport[]>> =>
        apiClient.get<HealthReport[]>('/users/profile/health-reports'),

    // POST /users/:id/health-reports — multipart upload
    uploadHealthReport: async (userId: string, file: File, title: string): Promise<ApiResponse<HealthReport>> => {
        const form = new FormData();
        form.append('file', file);
        form.append('title', title);
        const res = await fetch(
            `${process.env.NEXT_PUBLIC_API_URL || 'https://api.ayuxacare.com/api'}/users/${userId}/health-reports`,
            {
                method: 'POST',
                headers: { 
                    Authorization: `Bearer ${apiClient.getToken()}` 
                    // Note: Browser adds boundary automatically for FormData, don't set Content-Type manually
                },
                body: form,
            }
        );
        return res.json();
    },

    // ── Bookings ──
    // GET /bookings/history
    getMyBookings: (): Promise<ApiResponse<Booking[]>> =>
        apiClient.get<Booking[]>('/bookings/history'),

    // POST /bookings/:id/cancel
    cancelBooking: (bookingId: string): Promise<ApiResponse<null>> =>
        apiClient.post<null>(`/bookings/${bookingId}/cancel`, {}),

    // ── Registration/Creation ──
    // POST /users — register/create new user profile post-OTP
    createUser: (data: Record<string, unknown>): Promise<ApiResponse<UserProfile & { accessToken: string; refreshToken: string }>> =>
        apiClient.post<UserProfile & { accessToken: string; refreshToken: string }>('/users', data),
};
