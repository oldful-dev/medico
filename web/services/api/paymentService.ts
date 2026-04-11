import { apiClient, ApiResponse } from './apiClient';

export interface InitiatePaymentData {
    amount: number;
    bookingId?: string;
    subscriptionId?: string;
    couponCode?: string;
}

export interface VerifyPaymentData {
    razorpayOrderId: string;
    razorpayPaymentId: string;
    razorpaySignature: string;
}

export const paymentService = {
    initiatePayment: async (data: InitiatePaymentData): Promise<ApiResponse> => {
        return apiClient.post('/payments/initiate', data);
    },

    verifyPayment: async (data: VerifyPaymentData): Promise<ApiResponse> => {
        return apiClient.post('/payments/verify', data);
    },

    /**
     * POST /api/payments/cancel
     * Called when user dismisses Razorpay (ondismiss) or payment.failed fires.
     * Marks the payment + booking as PAYMENT_FAILED on the backend.
     * Prevents ghost PAYMENT_PENDING bookings from appearing in the bookings list.
     */
    cancelPayment: async (orderId: string): Promise<ApiResponse> => {
        return apiClient.post('/payments/cancel', { orderId });
    },

    getPaymentMethods: async (): Promise<ApiResponse> => {
        return apiClient.get('/payments/methods');
    },

    applyCoupon: async (couponCode: string, amount: number): Promise<ApiResponse> => {
        return apiClient.post('/payments/apply-coupon', { couponCode, amount });
    }
};
