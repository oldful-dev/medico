import { apiClient, ApiResponse } from './apiClient';

export interface RequestOTPPayload {
    phoneNumber: string;
}

export interface VerifyOTPPayload {
    phoneNumber: string;
    otp: string;
}

export interface VerifyOTPResponseData {
    isNewUser: boolean;
    phoneNumber?: string;       // Returned when isNewUser = true (for profile-setup)
    accessToken?: string;
    refreshToken?: string;
    firebaseToken?: string;
    user?: {
        id: string;
        uniqueUserId: string;
        name: string;
        phone: string;
    };
}

export const authService = {
    /**
     * POST /api/auth/request-otp
     * Sends OTP to the given phone number.
     */
    requestOTP: async (data: RequestOTPPayload): Promise<ApiResponse> => {
        return apiClient.post('/auth/request-otp', data);
    },

    /**
     * POST /api/auth/verify-otp
     * Verifies OTP. Returns tokens for existing users, or isNewUser flag.
     * Note: Token storage (cookies + memory) is handled by authStore.login().
     */
    verifyOTP: async (data: VerifyOTPPayload): Promise<ApiResponse<VerifyOTPResponseData>> => {
        return apiClient.post<VerifyOTPResponseData>('/auth/verify-otp', data);
    },
};
