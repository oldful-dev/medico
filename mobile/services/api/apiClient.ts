// API Client - Base HTTP client configuration
// Centralized API configuration, interceptors, auth token handling

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000/api';

interface RequestConfig {
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  endpoint: string;
  body?: any;
  headers?: Record<string, string>;
}

class ApiClient {
  private baseUrl: string;
  private authToken: string | null = null;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  setAuthToken(token: string) {
    this.authToken = token;
  }

  clearAuthToken() {
    this.authToken = null;
  }

  async request<T>(config: RequestConfig): Promise<T> {
    // TODO: Implement fetch with interceptors
    throw new Error('Not implemented');
  }

  async get<T>(endpoint: string): Promise<T> {
    return this.request({ method: 'GET', endpoint });
  }

  async post<T>(endpoint: string, body: any): Promise<T> {
    return this.request({ method: 'POST', endpoint, body });
  }

  async put<T>(endpoint: string, body: any): Promise<T> {
    return this.request({ method: 'PUT', endpoint, body });
  }

  async delete<T>(endpoint: string): Promise<T> {
    return this.request({ method: 'DELETE', endpoint });
  }
}

export const apiClient = new ApiClient(API_BASE_URL);
export default ApiClient;
