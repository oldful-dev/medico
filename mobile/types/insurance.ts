// Insurance Types
export interface InsurancePlan {
  id: string;
  name: string;
  type: 'basic' | 'standard' | 'premium';
  coverage: number;
  premium: number;
  premiumFrequency: 'monthly' | 'quarterly' | 'annually';
  features: string[];
  eligibilityAge: { min: number; max: number };
  waitingPeriod: string;
  exclusions: string[];
}

export type PreExistingCondition = 
  | 'diabetes'
  | 'hypertension'
  | 'heart-disease'
  | 'kidney-disease'
  | 'asthma'
  | 'arthritis'
  | 'thyroid'
  | 'cancer'
  | 'other';

export interface InsuranceApplication {
  id: string;
  planId: string;
  applicantName: string;
  applicantAge: number;
  preExistingConditions: PreExistingCondition[];
  documents: string[];
  status: 'draft' | 'submitted' | 'under-review' | 'approved' | 'rejected';
  calculatedPremium: number;
  submittedAt?: string;
}
