export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'https://oldful-dev.onrender.com/api';

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

class ApiClient {
    private baseUrl: string;

    constructor(baseUrl: string) {
        this.baseUrl = baseUrl;
    }

    private getToken(): string | null {
        if (typeof window !== 'undefined') {
            return localStorage.getItem('@oldful_auth_token');
        }
        return null;
    }

    private async request<T>(endpoint: string, options: RequestInit = {}): Promise<ApiResponse<T>> {
        const url = `${this.baseUrl}${endpoint}`;
        const headers: Record<string, string> = { ...options.headers as Record<string, string> };

        const token = this.getToken();
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }

        if (!(options.body instanceof FormData)) {
            headers['Content-Type'] = 'application/json';
        }

        const config: RequestInit = {
            ...options,
            headers,
        };

        try {
            const response = await fetch(url, config);
            const json = await response.json().catch(() => null);

            if (!response.ok) {
                if (response.status === 401) {
                    // Trigger global logout for token invalidation
                    if (typeof window !== 'undefined') {
                        const { useAuthStore } = require('@/store/authStore');
                        useAuthStore.getState().logout();
                    }
                }
                
                // Global Error Dispatch for UI consumption
                if (typeof window !== 'undefined' && response.status >= 500) {
                    window.dispatchEvent(new CustomEvent('api-error', { 
                        detail: { message: json?.message || 'Server Error. Please try again.' } 
                    }));
                }

                throw new ApiError(
                    response.status,
                    json?.message || `Request failed with status ${response.status}`,
                    json
                );
            }

            return json as ApiResponse<T>;
        } catch (error) {
            if (error instanceof ApiError) throw error;
            
            // Network failures (CORS, offline, DNS)
            if (typeof window !== 'undefined') {
                window.dispatchEvent(new CustomEvent('api-error', { 
                    detail: { message: 'Network error. Please check your connection.' } 
                }));
            }
            
            throw new ApiError(0, `Network error: ${error instanceof Error ? error.message : String(error)}`);
        }
    }

    async get<T>(endpoint: string): Promise<ApiResponse<T>> {
        return this.request<T>(endpoint, { method: 'GET' });
    }

    async post<T>(endpoint: string, body?: any): Promise<ApiResponse<T>> {
        return this.request<T>(endpoint, { method: 'POST', body: body instanceof FormData ? body : JSON.stringify(body) });
    }

    async put<T>(endpoint: string, body?: any): Promise<ApiResponse<T>> {
        return this.request<T>(endpoint, { method: 'PUT', body: body instanceof FormData ? body : JSON.stringify(body) });
    }

    async patch<T>(endpoint: string, body?: any): Promise<ApiResponse<T>> {
        return this.request<T>(endpoint, { method: 'PATCH', body: body instanceof FormData ? body : JSON.stringify(body) });
    }

    async delete<T>(endpoint: string): Promise<ApiResponse<T>> {
        return this.request<T>(endpoint, { method: 'DELETE' });
    }
}

export const apiClient = new ApiClient(API_BASE_URL);
