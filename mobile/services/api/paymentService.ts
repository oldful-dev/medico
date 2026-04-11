// ──────────────────────────────────────────────
//  Payment Service — Wired to backend payment routes
//  GET    /api/payments/methods
//  POST   /api/payments/initiate
//  POST   /api/payments/verify
//  POST   /api/payments/apply-coupon
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
    subscriptionId?: string;
    amount: number;
    paymentMethod?: PaymentMethod;
    couponCode?: string;
}

export interface InitiatePaymentResponse {
    orderId: string;            // razorpayOrderId
    amount: number;
    currency: string;
    paymentId: string;          // internal payment record ID
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
        const response = await apiClient.post<VerifyPaymentResponse>('/payments/verify', data);
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
     * Marks the payment + booking as PAYMENT_FAILED on the backend.
     * This prevents the booking from appearing in Cart/Active views.
     */
    cancelPayment: async (orderId: string): Promise<ApiResponse<{ orderId: string; bookingId: string | null }>> => {
        return apiClient.post('/payments/cancel', { orderId });
    },
};
