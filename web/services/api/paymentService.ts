import { apiClient, ApiResponse } from './apiClient';

export interface InitiatePaymentData {
    amount: number;
    bookingId?: string;
    subscriptionId?: string;
    productOrderId?: string;
    couponCode?: string;
}

export interface VerifyPaymentData {
    razorpayOrderId: string;
    razorpayPaymentId: string;
    razorpaySignature: string;
}

export interface PaymentInitiateResponse {
    orderId: string;
    amount: number;
    currency: string;
    key: string;
}

export const paymentService = {
    initiatePayment: async (data: InitiatePaymentData): Promise<ApiResponse<PaymentInitiateResponse>> => {
        return apiClient.post<PaymentInitiateResponse>('/payments/initiate', data);
    },

    verifyPayment: async (data: VerifyPaymentData): Promise<ApiResponse<unknown>> => {
        return apiClient.post('/payments/verify', data);
    },

    /**
     * POST /api/payments/cancel
     * Called when user dismisses Razorpay (ondismiss) or payment.failed fires.
     * Marks the payment + booking as PAYMENT_FAILED on the backend.
     * Prevents ghost PAYMENT_PENDING bookings from appearing in the bookings list.
     */
    cancelPayment: async (orderId: string): Promise<ApiResponse<unknown>> => {
        return apiClient.post('/payments/cancel', { orderId });
    },

    getPaymentMethods: async (): Promise<ApiResponse<unknown>> => {
        return apiClient.get('/payments/methods');
    },

    applyCoupon: async (couponCode: string, amount: number): Promise<ApiResponse<unknown>> => {
        return apiClient.post('/payments/apply-coupon', { couponCode, amount });
    }
};
