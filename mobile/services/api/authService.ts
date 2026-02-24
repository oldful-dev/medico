// Auth Service - OTP login, token management, session handling
import { apiClient } from './apiClient';

export interface LoginRequest {
  phoneNumber: string;
}

export interface OTPVerifyRequest {
  phoneNumber: string;
  otp: string;
}

export interface AuthResponse {
  token: string;
  userId: string;
  isNewUser: boolean;
}

export const authService = {
  requestOTP: async (data: LoginRequest): Promise<void> => {
    // TODO: POST /auth/request-otp
  },

  verifyOTP: async (data: OTPVerifyRequest): Promise<AuthResponse> => {
    // TODO: POST /auth/verify-otp
    throw new Error('Not implemented');
  },

  logout: async (): Promise<void> => {
    // TODO: POST /auth/logout
    apiClient.clearAuthToken();
  },

  refreshToken: async (): Promise<string> => {
    // TODO: POST /auth/refresh
    throw new Error('Not implemented');
  },
};
