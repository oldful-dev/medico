// ──────────────────────────────────────────────
//  useAuthHooks — React Query wrappers for auth mutations
//  Uses authService + authStore, mirrors mobile authService.ts
// ──────────────────────────────────────────────

import { useMutation } from '@tanstack/react-query';
import { authService } from '@/services/api/authService';
import { useAuthStore, AuthUser } from '@/store/authStore';

export const useAuthHooks = () => {

    // ─── Send OTP ─────────────────────────────────────────────────────────
    const useSendOtp = () => {
        return useMutation({
            mutationFn: async (phone: string) => {
                // Matches mobile: authService.requestOTP({ phoneNumber })
                return authService.requestOTP({ phoneNumber: `+91${phone}` });
            },
        });
    };

    // ─── Verify OTP ───────────────────────────────────────────────────────
    const useVerifyOtp = () => {
        const { login } = useAuthStore();

        return useMutation({
            mutationFn: async (data: { phone: string; otp: string }) => {
                // Matches mobile: authService.verifyOTP({ phoneNumber, otp })
                const response = await authService.verifyOTP({
                    phoneNumber: `+91${data.phone}`,
                    otp: data.otp,
                });

                if (response.success && response.data && !response.data.isNewUser) {
                    const { accessToken, refreshToken, user } = response.data;
                    if (accessToken && refreshToken && user) {
                        // Mirrors mobile: login(accessToken, refreshToken, userId)
                        await login(accessToken, refreshToken, user as AuthUser);
                    }
                }

                return response.data;
            },
        });
    };

    return {
        useSendOtp,
        useVerifyOtp,
    };
};
