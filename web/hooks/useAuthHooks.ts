import { useMutation, useQuery } from '@tanstack/react-query';
import { apiClient } from '@/services/api/apiClient';
import { useAuthStore } from '@/store/authStore';

// Note: These endpoints match the mobile authService.ts routes
export const useAuthHooks = () => {
    
    // Login / Send OTP
    const useSendOtp = () => {
        return useMutation({
            mutationFn: async (phone: string) => {
                return apiClient.post<{ message: string }>('/auth/login', { phone });
            }
        });
    };

    // Verify OTP
    const useVerifyOtp = () => {
        const login = useAuthStore(state => state.login);
        
        return useMutation({
            mutationFn: async (data: { phone: string; otp: string }) => {
                const response = await apiClient.post<{ token: string, user: any }>('/auth/verify', data);
                if (response.data?.token) {
                    // Sync with Zustand and Cookie Middleware
                    login(response.data.token);
                }
                return response.data;
            }
        });
    };

    // Complete Profile (After Verification if new user)
    const useCompleteProfile = () => {
        return useMutation({
            mutationFn: async (profileData: any) => {
                return apiClient.post('/auth/complete-profile', profileData);
            }
        });
    };

    return {
        useSendOtp,
        useVerifyOtp,
        useCompleteProfile
    };
};
