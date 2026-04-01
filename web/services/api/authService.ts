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
    phoneNumber?: string; 
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
    requestOTP: async (data: RequestOTPPayload): Promise<ApiResponse> => {
        return apiClient.post('/auth/request-otp', data);
    },

    verifyOTP: async (data: VerifyOTPPayload): Promise<ApiResponse<VerifyOTPResponseData>> => {
        const response = await apiClient.post<VerifyOTPResponseData>('/auth/verify-otp', data);
        if (response.success && response.data && !response.data.isNewUser) {
            if (response.data.accessToken) {
                if (typeof window !== 'undefined') {
                    localStorage.setItem('@oldful_auth_token', response.data.accessToken);
                    localStorage.setItem('@oldful_refresh_token', response.data.refreshToken || '');
                }
            }
        }
        return response;
    },

    logout: async (): Promise<ApiResponse> => {
        const response = await apiClient.post('/auth/logout');
        if (typeof window !== 'undefined') {
            localStorage.removeItem('@oldful_auth_token');
            localStorage.removeItem('@oldful_refresh_token');
        }
        return response;
    },
};
