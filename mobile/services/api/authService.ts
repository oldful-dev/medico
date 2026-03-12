// ──────────────────────────────────────────────
//  Auth Service — Wired to backend auth routes
//  POST /api/auth/request-otp
//  POST /api/auth/verify-otp
//  POST /api/auth/user/refresh
//  POST /api/auth/logout
// ──────────────────────────────────────────────

import { apiClient, ApiResponse } from './apiClient';

// ─── Request / Response Types ─────────────────

export interface RequestOTPPayload {
    phoneNumber: string;
}

export interface VerifyOTPPayload {
    phoneNumber: string;
    otp: string;
}

export interface VerifyOTPResponseData {
    isNewUser: boolean;
    phoneNumber?: string; // returned when isNewUser = true
    accessToken?: string;
    refreshToken?: string;
    user?: {
        id: string;
        uniqueUserId: string;
        name: string;
        phone: string;
    };
}

export interface RefreshTokenResponseData {
    accessToken: string;
}

// ─── Service ──────────────────────────────────

export const authService = {
    /**
     * POST /api/auth/request-otp
     * Triggers OTP delivery via WhatsApp to the given phone number.
     */
    requestOTP: async (data: RequestOTPPayload): Promise<ApiResponse> => {
        return apiClient.post('/auth/request-otp', data);
    },

    /**
     * POST /api/auth/verify-otp
     * Verifies OTP. Returns tokens for existing users, or isNewUser flag for new registrations.
     */
    verifyOTP: async (data: VerifyOTPPayload): Promise<ApiResponse<VerifyOTPResponseData>> => {
        const response = await apiClient.post<VerifyOTPResponseData>('/auth/verify-otp', data);
        if (response.success && response.data && !response.data.isNewUser) {
            if (response.data.accessToken) {
                apiClient.setAuthToken(response.data.accessToken);
            }
            if (response.data.refreshToken) {
                apiClient.setRefreshToken(response.data.refreshToken);
            }
        }
        return response;
    },

    /**
     * POST /api/auth/user/refresh
     * Exchanges a valid refresh token for a new access token.
     */
    refreshToken: async (refreshToken: string): Promise<ApiResponse<RefreshTokenResponseData>> => {
        return apiClient.post<RefreshTokenResponseData>('/auth/user/refresh', { refreshToken });
    },

    /**
     * POST /api/auth/logout
     * Invalidates the server-side refresh token. Requires auth header.
     */
    logout: async (): Promise<ApiResponse> => {
        const response = await apiClient.post('/auth/logout');
        apiClient.clearAuthToken();
        return response;
    },
};
