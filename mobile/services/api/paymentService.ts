// Payment Service - Checkout, payment methods, refunds
import { apiClient } from './apiClient';

export interface PaymentMethod {
  id: string;
  type: 'upi' | 'card' | 'netbanking' | 'wallet';
  label: string;
  isDefault: boolean;
}

export interface PaymentRequest {
  bookingId: string;
  amount: number;
  paymentMethodId: string;
  couponCode?: string;
}

export interface RefundRequest {
  bookingId: string;
  reason: string;
  type: 'sla-breach' | 'compassionate' | 'cancellation' | 'other';
}

export const paymentService = {
  getPaymentMethods: async (): Promise<PaymentMethod[]> => {
    // TODO: GET /payments/methods
    throw new Error('Not implemented');
  },

  initiatePayment: async (data: PaymentRequest): Promise<{ orderId: string; gatewayUrl: string }> => {
    // TODO: POST /payments/initiate
    throw new Error('Not implemented');
  },

  verifyPayment: async (orderId: string): Promise<{ success: boolean }> => {
    // TODO: POST /payments/verify
    throw new Error('Not implemented');
  },

  requestRefund: async (data: RefundRequest): Promise<{ refundId: string; status: string }> => {
    // TODO: POST /payments/refund
    throw new Error('Not implemented');
  },

  getRefundStatus: async (refundId: string): Promise<{ status: string; amount: number }> => {
    // TODO: GET /payments/refund/:id
    throw new Error('Not implemented');
  },

  applyCoupon: async (couponCode: string, amount: number): Promise<{ discount: number; finalAmount: number }> => {
    // TODO: POST /payments/apply-coupon
    throw new Error('Not implemented');
  },
};
