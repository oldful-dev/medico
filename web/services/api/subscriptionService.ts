import { apiClient, ApiResponse } from './apiClient';

export type BillingCycle = 'MONTHLY' | 'QUARTERLY' | 'BIANNUAL' | 'YEARLY';

export interface Subscription {
  id: string;
  userId: string;
  planId: string;
  billingCycle: BillingCycle;
  startDate: string;
  expiryDate: string;
  amount: number;
  status: 'PAYMENT_PENDING' | 'ACTIVE' | 'EXPIRING' | 'EXPIRED' | 'PAUSED' | 'CANCELLED';
  autoRenew: boolean;
}

export interface InitiateSubscriptionData {
  planId: string;
  billingCycle: BillingCycle;
  amount: number;
}

export const subscriptionService = {
  initiateSubscription: async (data: InitiateSubscriptionData): Promise<ApiResponse<Subscription>> => {
    return apiClient.post<Subscription>('/subscriptions/initiate', data);
  }
};
