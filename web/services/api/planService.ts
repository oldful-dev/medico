import { apiClient, ApiResponse } from './apiClient';

export interface Plan {
  id: string;
  name: string;
  description: string;
  benefits: string;
  quarterlyPrice: number;
  biannualPrice: number;
  yearlyPrice: number;
  isVisible: boolean;
  sortOrder: number;
}

export const planService = {
  getPlans: async (): Promise<ApiResponse<Plan[]>> => {
    return apiClient.get<Plan[]>('/plans');
  },
  
  getPlanById: async (id: string): Promise<ApiResponse<Plan>> => {
    return apiClient.get<Plan>(`/plans/${id}`);
  }
};
