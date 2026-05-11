// ──────────────────────────────────────────────
//  API Client — Web (mirrors mobile apiClient.ts)
//
//  Token Strategy:
//    - accessToken held IN MEMORY (like mobile's in-memory state)
//    - On 401: silent refresh via /api/auth/refresh (Next.js route)
//    -         refresh route reads httpOnly cookie → calls backend
//    - Authorization: Bearer <token> on every request (same as mobile)
// ──────────────────────────────────────────────

export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'https://Ayuxacare.onrender.com/api';

export interface ApiResponse<T = unknown> {
    success: boolean;
    message?: string;
    data?: T;
}

export interface PaginatedApiResponse<T = unknown> {
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
    details: unknown;

    constructor(statusCode: number, message: string, details?: unknown) {
        super(message);
        this.name = 'ApiError';
        this.statusCode = statusCode;
        this.details = details;
    }
}

class ApiClient {
    private baseUrl: string;

    // In-memory access token — mirrors mobile's `this.authToken`
    private accessToken: string | null = null;

    // Prevent thundering herd: only one refresh call at a time
    private refreshPromise: Promise<boolean> | null = null;

    // Callbacks — mirrors mobile AuthContext integration
    private onTokenRefreshed: ((token: string) => void) | null = null;
    private onAuthFailure: (() => void) | null = null;

    constructor(baseUrl: string) {
        this.baseUrl = baseUrl;
    }

    // ─── Token Management (mirrors mobile apiClient) ──────────────────────
    setToken(token: string | null) {
        this.accessToken = token;
    }

    clearToken() {
        this.accessToken = null;
    }

    getToken(): string | null {
        return this.accessToken;
    }

    setTokenRefreshedCallback(cb: (token: string) => void) {
        this.onTokenRefreshed = cb;
    }

    setAuthFailureCallback(cb: () => void) {
        this.onAuthFailure = cb;
    }

    // ─── Core Request Method ──────────────────────────────────────────────
    private async request<T>(
        endpoint: string,
        options: RequestInit = {},
        isRetry = false
    ): Promise<ApiResponse<T>> {
        const url = `${this.baseUrl}${endpoint}`;
        const headers: Record<string, string> = {
            ...(options.headers as Record<string, string> || {}),
        };

        // Attach Bearer token — same as mobile
        if (this.accessToken) {
            headers['Authorization'] = `Bearer ${this.accessToken}`;
        }

        if (!(options.body instanceof FormData)) {
            headers['Content-Type'] = 'application/json';
        }

        try {
            const response = await fetch(url, { ...options, headers });
            const json = await response.json().catch(() => null);

            // 401 handling — attempt silent refresh once (mirrors mobile)
            if (response.status === 401 && !isRetry) {
                // If we're already on /auth, don't try to refresh or redirect again
                if (typeof window !== 'undefined' && window.location.pathname === '/auth') {
                    throw new ApiError(401, 'Unauthorized');
                }

                const refreshed = await this.attemptTokenRefresh();
                if (refreshed) {
                    return this.request<T>(endpoint, options, true); // retry with new token
                } else {
                    // Refresh failed — trigger auth failure (like mobile onAuthFailure)
                    if (this.onAuthFailure) this.onAuthFailure();
                    throw new ApiError(401, 'Session expired. Please log in again.');
                }
            }

            if (!response.ok) {
                throw new ApiError(
                    response.status,
                    json?.message || `Request failed with status ${response.status}`,
                    json
                );
            }

            return json as ApiResponse<T>;
        } catch (error) {
            if (error instanceof ApiError) throw error;
            throw new ApiError(0, `Network error: ${error instanceof Error ? error.message : String(error)}`);
        }
    }

    // ─── Silent Token Refresh ─────────────────────────────────────────────
    // Mirrors mobile's `attemptTokenRefresh()` but calls Next.js route
    // instead of directly calling backend (Next.js route reads httpOnly cookie)
    private async attemptTokenRefresh(): Promise<boolean> {
        // Prevent multiple parallel refresh calls
        if (this.refreshPromise) {
            return this.refreshPromise;
        }

        this.refreshPromise = (async () => {
            try {
                const response = await fetch('/api/auth/refresh', {
                    method: 'POST',
                });

                if (!response.ok) return false;

                const data = await response.json();
                if (data.success && data.data?.accessToken) {
                    this.accessToken = data.data.accessToken;
                    if (this.onTokenRefreshed) {
                        this.onTokenRefreshed(data.data.accessToken);
                    }
                    return true;
                }
                return false;
            } catch {
                return false;
            } finally {
                this.refreshPromise = null;
            }
        })();

        return this.refreshPromise;
    }

    // ─── Convenience Methods ──────────────────────────────────────────────
    async get<T>(endpoint: string): Promise<ApiResponse<T>> {
        return this.request<T>(endpoint, { method: 'GET' });
    }

    async post<T>(endpoint: string, body?: unknown): Promise<ApiResponse<T>> {
        return this.request<T>(endpoint, {
            method: 'POST',
            body: body instanceof FormData ? body : JSON.stringify(body),
        });
    }

    async put<T>(endpoint: string, body?: unknown): Promise<ApiResponse<T>> {
        return this.request<T>(endpoint, {
            method: 'PUT',
            body: body instanceof FormData ? body : JSON.stringify(body),
        });
    }

    async patch<T>(endpoint: string, body?: unknown): Promise<ApiResponse<T>> {
        return this.request<T>(endpoint, {
            method: 'PATCH',
            body: body instanceof FormData ? body : JSON.stringify(body),
        });
    }

    async delete<T>(endpoint: string): Promise<ApiResponse<T>> {
        return this.request<T>(endpoint, { method: 'DELETE' });
    }

    async upload<T>(endpoint: string, formData: FormData): Promise<ApiResponse<T>> {
        return this.request<T>(endpoint, { method: 'POST', body: formData });
    }

    async download(endpoint: string): Promise<Blob> {
        const url = `${this.baseUrl}${endpoint}`;
        const headers: Record<string, string> = {};
        if (this.accessToken) {
            headers['Authorization'] = `Bearer ${this.accessToken}`;
        }

        const response = await fetch(url, { method: 'GET', headers });
        if (!response.ok) {
            throw new ApiError(response.status, 'Failed to download file');
        }
        return response.blob();
    }
}

export const apiClient = new ApiClient(API_BASE_URL);
