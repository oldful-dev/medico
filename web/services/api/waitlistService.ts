import { apiClient } from './apiClient';

export interface WaitlistPayload {
  name: string;
  email: string;
  city?: string;
  source?: string;
}

const waitlistService = {
  join: async (payload: WaitlistPayload) => {
    const response = await apiClient.post('/waitlist', payload);
    return response.data;
  },
};

export default waitlistService;
