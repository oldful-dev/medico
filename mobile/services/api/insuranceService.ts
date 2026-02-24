// Insurance Service - Plans, applications, pre-existing conditions
import { apiClient } from './apiClient';

export interface InsurancePlan {
  id: string;
  name: string;
  coverage: string;
  premium: number;
  features: string[];
  eligibility: string[];
  exclusions: string[];
}

export interface InsuranceApplication {
  id?: string;
  planId: string;
  applicantDetails: {
    name: string;
    age: number;
    gender: string;
  };
  preExistingConditions: string[];
  documents?: string[];
  status?: 'draft' | 'submitted' | 'under-review' | 'approved' | 'rejected';
}

export const insuranceService = {
  getPlans: async (): Promise<InsurancePlan[]> => {
    // TODO: GET /insurance/plans
    throw new Error('Not implemented');
  },

  getPlanById: async (planId: string): Promise<InsurancePlan> => {
    // TODO: GET /insurance/plans/:id
    throw new Error('Not implemented');
  },

  calculatePremium: async (conditions: string[]): Promise<{ premium: number }> => {
    // TODO: POST /insurance/calculate-premium
    throw new Error('Not implemented');
  },

  submitApplication: async (application: InsuranceApplication): Promise<InsuranceApplication> => {
    // TODO: POST /insurance/applications
    throw new Error('Not implemented');
  },

  getApplicationStatus: async (applicationId: string): Promise<InsuranceApplication> => {
    // TODO: GET /insurance/applications/:id
    throw new Error('Not implemented');
  },
};
