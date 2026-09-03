import { apiClient, PaginatedApiResponse } from './apiClient';
import { formatters } from '@/utils/formatters';

/**
 * Builds the `patient` block for a lab booking from the user profile, or throws
 * a user-facing message naming exactly what's missing. Redcliffe rejects bookings
 * with age 0 / unknown gender / wrong-gender-for-test, so we validate up front
 * instead of sending "30" / "M" placeholders that cause opaque failures later.
 */
export function resolvePatient(
    profile: { name?: string; gender?: string; dateOfBirth?: string } | null,
    phone: string
): { name: string; age: number; gender: 'male' | 'female'; phone: string } {
    if (!profile?.name?.trim()) throw new Error('Please add your name in Profile before booking.');

    const age = formatters.ageFromDob(profile.dateOfBirth);
    if (!age) throw new Error('Please set your date of birth in Profile — the lab needs the patient age.');

    const g = (profile.gender || '').trim().toUpperCase();
    const gender = (g === 'M' || g === 'MALE') ? 'male' : (g === 'F' || g === 'FEMALE') ? 'female' : null;
    if (!gender) throw new Error('Please set your gender in Profile before booking a lab test.');

    const digits = phone.replace(/\D/g, '').slice(-10);
    if (digits.length !== 10) throw new Error('Please enter a valid 10-digit phone number.');

    return { name: profile.name.trim(), age, gender, phone: `+91${digits}` };
}

export interface LabPackage {
    code: string;
    name: string;
    cost: number;
    discounted_cost?: number;
    fasting: boolean;
    tests_count?: number;
    packages_count?: number;
    tests?: string[];
    preparation?: string;
    collectionType?: string;
    reportTime?: string;
    description?: string;
    // Real Redcliffe fields (pass-through from backend, no fallback needed)
    fasting_time?: string | null;
    tat_time?: string | null;
    specimen_instructions?: string | null;
    test_category?: string | null;
    category_for_web?: { id: number; name: string }[];
}

export interface LabSlot {
    slot_id: number;
    slot: string;
    slot_time?: string;
}

export interface LabBookingPayload {
    // Only HOME is offered in-app. DROP_OFF exists backend-side but has no UI;
    // LAB (centre visit) was removed — it silently booked a home collection
    // because the backend has no imaging-booking path.
    bookingType: 'HOME';
    patient: {
        name: string;
        age: number;
        gender: string;
        phone: string;
        email?: string;
    };
    address: {
        lat: string;
        long: string;
        pincode: string;
        line1: string;
        line2?: string;
        landmark?: string;
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
    trackingLink?: string | null; // Opaque Redcliffe phlebo-tracking URL, set once phleboassigned webhook fires
    reportUrl?: string;
    createdAt: string;
    payments?: Array<{ status: string; amount: number }>;
}

// Shape of GET /labs/booking/:id/digital-report — real Redcliffe structured test values
// (name/value/unit/reference range/highlight), NOT a PDF. Confirmed against the Redcliffe
// API Wiki: distinct from get-consolidated-report, which only returns a report PDF link.
export interface DigitalReportTestValue {
    id: string;
    test_parameter: {
        id: number;
        name: string;
        unit: string;
        reference_range_male?: string;
        reference_range_female?: string;
    };
    value: string;
    is_highlighted?: boolean;
}

export interface DigitalReportEntry {
    booking_id: number;
    collection_date: string;
    test_code: string;
    test_name: string;
    test_values: DigitalReportTestValue[];
}

export const labService = {
    // Paginated — Redcliffe has ~1700 packages, 15/page. Returns the page plus
    // whether more pages exist, for infinite scroll on the blood-test list.
    getPackages: async (search = '', page = 1): Promise<{ items: LabPackage[]; hasMore: boolean; page: number }> => {
        const res = await apiClient.request<any>({
            method: 'GET',
            endpoint: `/labs/packages?search=${encodeURIComponent(search)}&page=${page}`,
            timeout: 15000
        }) as unknown as PaginatedApiResponse<LabPackage>;
        return {
            items: res.data || [],
            hasMore: res.pagination?.hasMore ?? false,
            page: res.pagination?.page ?? page,
        };
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

    getUserLabOrders: async () => {
        const response = await apiClient.get<LabOrderListItem[]>('/labs/my-orders');
        return response;
    },

    getLabOrderById: async (id: string) => {
        const response = await apiClient.get<LabOrderListItem>(`/labs/booking/${id}`);
        return response;
    },

    getDigitalReport: async (id: string) => {
        const response = await apiClient.get<DigitalReportEntry[]>(`/labs/booking/${id}/digital-report`);
        return response;
    },

    cancelLabOrder: async (id: string) => {
        const response = await apiClient.post(`/labs/booking/${id}/cancel`, {});
        return response;
    },

    confirmBooking: async (payload: {
        labOrderId: string;
        razorpayOrderId?: string;
        isPaid?: boolean;
    }) => {
        const response = await apiClient.post<any>('/labs/book/confirm', payload);
        return response;
    }
};
