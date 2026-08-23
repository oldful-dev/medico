// ──────────────────────────────────────────────
//  Payment Service — Wired to backend payment routes
//  GET    /api/payments/methods
//  POST   /api/payments/initiate
//  POST   /api/payments/verify
//  POST   /api/payments/apply-coupon
//  GET    /api/payments/saved-cards
//  POST   /api/payments/saved-cards
//  DELETE /api/payments/saved-cards/:id
//  PUT    /api/payments/saved-cards/:id/set-default
// ──────────────────────────────────────────────

import { apiClient, ApiResponse } from './apiClient';
import { AnalyticsEvents } from '../firebase/analyticsEvents';

// ─── Types (aligned with Prisma schema) ───────

export type PaymentMethod = 'UPI' | 'CARD' | 'NETBANKING' | 'WALLET' | 'CASH';
export type PaymentStatus = 'INITIATED' | 'SUCCESS' | 'FAILED' | 'REFUND_INITIATED' | 'REFUNDED';

export interface PaymentMethodOption {
    type: PaymentMethod;
    label: string;
    icon?: string;
}

export interface InitiatePaymentPayload {
    bookingId?: string;
    labOrderId?: string;
    subscriptionId?: string;
    meetupId?: string;
    productOrderId?: string;
    amount: number;
    paymentMethod?: PaymentMethod;
    couponCode?: string;
    upgradePlanId?: string;
    upgradeBillingCycle?: string;
}

export interface InitiatePaymentResponse {
    orderId: string | null;            // razorpayOrderId (null if not required)
    amount: number;
    currency: string;
    paymentId: string;          // internal payment record ID
    paymentNotRequired?: boolean; // True if amount < ₹1
}

export interface VerifyPaymentPayload {
    razorpayOrderId: string;
    razorpayPaymentId: string;
    razorpaySignature: string;
}

export interface VerifyPaymentResponse {
    success: boolean;
    payment: {
        id: string;
        status: PaymentStatus;
        amount: number;
    };
    invoice?: {
        id: string;
        invoiceNumber: string;
        pdfUrl?: string;
    };
}

export interface ApplyCouponPayload {
    couponCode: string;
    amount: number;
}

export interface ApplyCouponResponse {
    valid: boolean;
    discount: number;
    finalAmount: number;
    coupon?: {
        code: string;
        discountType: string;
        discountValue: number;
    };
}

export interface SavedCard {
    id: string;
    cardLast4: string;
    cardBrand: string;
    cardType: 'CARD' | 'UPI';
    cardholderName?: string;
    expiryMonth?: string;
    expiryYear?: string;
    upiId?: string;
    razorpayToken?: string;
    isDefault: boolean;
    createdAt: string;
}

export interface AddCardPayload {
    cardType: 'CARD' | 'UPI';
    // CARD fields
    cardLast4?: string;
    cardBrand?: string;
    cardholderName?: string;
    expiryMonth?: string;
    expiryYear?: string;
    razorpayToken?: string;
    // UPI fields
    upiId?: string;
    setDefault?: boolean;
}

// ─── Service ──────────────────────────────────

export const paymentService = {
    /**
     * GET /api/payments/methods
     * List available payment methods.
     */
    getPaymentMethods: async (): Promise<ApiResponse<PaymentMethodOption[]>> => {
        return apiClient.get<PaymentMethodOption[]>('/payments/methods');
    },

    /**
     * POST /api/payments/initiate
     * Create a Razorpay order for a booking or subscription.
     */
    initiatePayment: async (data: InitiatePaymentPayload): Promise<ApiResponse<InitiatePaymentResponse>> => {
        AnalyticsEvents.trackPaymentInitiated(data.amount, data.paymentMethod || 'unknown');
        return apiClient.post<InitiatePaymentResponse>('/payments/initiate', data);
    },

    /**
     * POST /api/payments/verify
     * Verify Razorpay payment signature after completion.
     */
    verifyPayment: async (data: VerifyPaymentPayload): Promise<ApiResponse<VerifyPaymentResponse>> => {
        const response = await apiClient.post<VerifyPaymentResponse>('/payments/verify', data, 30000);
        if (response.success && response.data?.payment) {
            AnalyticsEvents.trackPaymentSuccess(response.data.payment.amount);
        } else {
            AnalyticsEvents.trackPaymentFailed('verification_failed');
        }
        return response;
    },

    /**
     * POST /api/payments/apply-coupon
     * Validate a coupon code and calculate discount.
     */
    applyCoupon: async (data: ApplyCouponPayload): Promise<ApiResponse<ApplyCouponResponse>> => {
        return apiClient.post<ApplyCouponResponse>('/payments/apply-coupon', data);
    },

    /**
     * POST /api/payments/cancel
     * Called when user dismisses Razorpay (ondismiss) or payment fails.
     */
    cancelPayment: async (orderId: string): Promise<ApiResponse<{ orderId: string; bookingId: string | null }>> => {
        return apiClient.post('/payments/cancel', { orderId });
    },

    // ─── Saved Cards ────────────────────────────────────────────────────

    getSavedCards: async (): Promise<ApiResponse<SavedCard[]>> => {
        return apiClient.get<SavedCard[]>('/payments/saved-cards');
    },

    addSavedCard: async (data: AddCardPayload): Promise<ApiResponse<SavedCard>> => {
        return apiClient.post<SavedCard>('/payments/saved-cards', data);
    },

    deleteSavedCard: async (id: string): Promise<ApiResponse<null>> => {
        return apiClient.delete<null>(`/payments/saved-cards/${id}`);
    },

    setDefaultCard: async (id: string): Promise<ApiResponse<null>> => {
        return apiClient.put<null>(`/payments/saved-cards/${id}/set-default`, {});
    },

    /**
     * POST /api/checkout/calculate
     * Get final order price and verify subscription benefits.
     */
    calculateCheckout: async (data: {
        serviceCategory: string;
        vendorFee: number;
        baseAyuxaFee?: number;
        diagnosticFee?: number;
        isPaidBooking?: boolean;
        /** Selected option id/label (e.g. Nurse Care's duration) — resolves the
         * per-option price from the service's admin-configured Options List. */
        selectedOption?: string;
    }): Promise<ApiResponse<{
        totalAmount: number;
        requiredPlanType?: 'CARE' | 'HOMEMAKER' | null;
        ayuxaRevenue?: number;
        providerRevenue?: number;
        breakdown: {
            serviceFee?: number;
            vendorFee: number;
            diagnosticFee: number;
            bookingFee: number;
            platformFee: number;
            taxes: number;
            ayuxaPlatformCharge?: number;
            ayuxaServiceFee?: number;
            ayuxaRevenue?: number;
            providerRevenue?: number;
            benefitDiscount: number;
        };
        benefitApplied: boolean;
        remainingCountAfterOrder: number;
    }>> => {
        return apiClient.post('/checkout/calculate', data);
    },

    /**
     * POST /api/checkout/calculate-membership-savings
     * Calculate membership savings on checkout.
     */
    calculateMembershipSavings: async (data: {
        serviceCategory: string;
        vendorFee: number;
        diagnosticFee?: number;
        planId: string;
        billingCycle: string;
        selectedOption?: string;
    }): Promise<ApiResponse<{
        bookingFeeWaived: number;
        platformFeeWaived: number;
        gstWaived: number;
        totalSavings: number;
        finalPayable: number;
        bookingTotalWithoutUpgrade: number;
        bookingTotalWithUpgrade: number;
        planPrice: number;
    }>> => {
        return apiClient.post('/checkout/calculate-membership-savings', data);
    },
};

