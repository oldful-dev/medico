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

    getPaymentMethods: async (): Promise<ApiResponse> => {
        return apiClient.get('/payments/methods');
    },

    applyCoupon: async (couponCode: string, amount: number): Promise<ApiResponse> => {
        return apiClient.post('/payments/apply-coupon', { couponCode, amount });
    }
};
