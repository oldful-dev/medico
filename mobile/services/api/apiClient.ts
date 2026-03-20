// ──────────────────────────────────────────────
//  API Client — Centralized HTTP layer
//  Matches backend: Express + JWT Bearer tokens
//  Base URL: http://<host>:5000/api
// ──────────────────────────────────────────────

import { Platform } from 'react-native';

// Android emulator uses 10.0.2.2 for localhost; iOS simulator uses localhost
const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'https://medico-crzu.onrender.com/api';

interface RequestConfig {
    method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
    endpoint: string;
    body?: any;
    headers?: Record<string, string>;
    isFormData?: boolean;
    timeout?: number;
}

export interface ApiResponse<T = any> {
    success: boolean;
    message?: string;
    data?: T;
}

export interface PaginatedApiResponse<T = any> {
    success: boolean;
    data: T[];
    pagination: {
        total: number;
        page: number;
        limit: number;
        totalPages: number;
        hasMore: boolean;
    };
}

class ApiClient {
    private baseUrl: string;
    private authToken: string | null = null;
    private refreshToken: string | null = null;
    private onTokenRefreshed: ((newToken: string) => void) | null = null;
    private onAuthFailure: (() => void) | null = null;

    constructor(baseUrl: string) {
        this.baseUrl = baseUrl;
    }

    // ─── Token Management ─────────────────────────
    setAuthToken(token: string | null) {
        this.authToken = token;
    }

    setRefreshToken(token: string | null) {
        this.refreshToken = token;
    }

    clearAuthToken() {
        this.authToken = null;
        this.refreshToken = null;
    }

    setTokenRefreshedCallback(callback: (newToken: string) => void) {
        this.onTokenRefreshed = callback;
    }

    setAuthFailureCallback(callback: () => void) {
        this.onAuthFailure = callback;
    }

    getBaseUrl(): string {
        return this.baseUrl;
    }

    // ─── Core Request Method ──────────────────────
    async request<T>(config: RequestConfig): Promise<ApiResponse<T>> {
        const url = `${this.baseUrl}${config.endpoint}`;

        const headers: Record<string, string> = {
            ...(config.headers || {}),
        };

        // Add auth header if token exists
        if (this.authToken) {
            headers['Authorization'] = `Bearer ${this.authToken}`;
        }

        // Set Content-Type for JSON (not for FormData)
        if (!config.isFormData) {
            headers['Content-Type'] = 'application/json';
        }

        const fetchConfig: RequestInit = {
            method: config.method,
            headers,
        };

        if (config.body) {
            fetchConfig.body = config.isFormData ? config.body : JSON.stringify(config.body);
        }

        // ─── Timeout & Abort Logic ───────────────────
        const timeout = config.timeout || 15000; // 15 seconds default
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeout);
        fetchConfig.signal = controller.signal;

        try {
            const response = await fetch(url, fetchConfig);
            clearTimeout(timeoutId);

            // Handle 401 — attempt token refresh
            if (response.status === 401 && this.refreshToken) {
                const refreshed = await this.attemptTokenRefresh();
                if (refreshed) {
                    // Retry original request with new token
                    headers['Authorization'] = `Bearer ${this.authToken}`;
                    const retryResponse = await fetch(url, { ...fetchConfig, headers });
                    return this.parseResponse<T>(retryResponse);
                } else {
                    // Refresh failed — trigger auth failure flow
                    if (this.onAuthFailure) this.onAuthFailure();
                    throw new ApiError(401, 'Session expired. Please login again.');
                }
            }

            return this.parseResponse<T>(response);
        } catch (error) {
            clearTimeout(timeoutId);
            
            if (error instanceof ApiError) throw error;
            
            const err = error as Error;
            if (err.name === 'AbortError') {
                throw new ApiError(408, 'Request timed out. Please check your internet connection.');
            }
            
            throw new ApiError(0, `Network error: ${err.message}`);
        }
    }

    // ─── Response Parser ──────────────────────────
    private async parseResponse<T>(response: Response): Promise<ApiResponse<T>> {
        const json = await response.json().catch(() => null);

        if (!response.ok) {
            throw new ApiError(
                response.status,
                json?.message || `Request failed with status ${response.status}`,
                json
            );
        }

        return json as ApiResponse<T>;
    }

    // ─── Token Refresh ────────────────────────────
    private async attemptTokenRefresh(): Promise<boolean> {
        try {
            const response = await fetch(`${this.baseUrl}/auth/user/refresh`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ refreshToken: this.refreshToken }),
            });

            if (!response.ok) return false;

            const json = await response.json();
            if (json.success && json.data?.accessToken) {
                this.authToken = json.data.accessToken;
                if (this.onTokenRefreshed) {
                    this.onTokenRefreshed(json.data.accessToken);
                }
                return true;
            }
            return false;
        } catch {
            return false;
        }
    }

    // ─── Convenience Methods ──────────────────────
    async get<T>(endpoint: string): Promise<ApiResponse<T>> {
        return this.request<T>({ method: 'GET', endpoint });
    }

    async post<T>(endpoint: string, body?: any): Promise<ApiResponse<T>> {
        return this.request<T>({ method: 'POST', endpoint, body });
    }

    async put<T>(endpoint: string, body?: any): Promise<ApiResponse<T>> {
        return this.request<T>({ method: 'PUT', endpoint, body });
    }

    async patch<T>(endpoint: string, body?: any): Promise<ApiResponse<T>> {
        return this.request<T>({ method: 'PATCH', endpoint, body });
    }

    async delete<T>(endpoint: string): Promise<ApiResponse<T>> {
        return this.request<T>({ method: 'DELETE', endpoint });
    }

    async upload<T>(endpoint: string, formData: FormData): Promise<ApiResponse<T>> {
        return this.request<T>({ method: 'POST', endpoint, body: formData, isFormData: true, timeout: 60000 });
    }
}

// ─── Custom API Error ─────────────────────────
export class ApiError extends Error {
    statusCode: number;
    details: any;

    constructor(statusCode: number, message: string, details?: any) {
        super(message);
        this.name = 'ApiError';
        this.statusCode = statusCode;
        this.details = details;
    }
}

// ─── Singleton Export ─────────────────────────
export const apiClient = new ApiClient(API_BASE_URL);
export default ApiClient;
