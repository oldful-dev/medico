// ──────────────────────────────────────────────
//  API Response Types — Matches backend helpers.js
//  sendResponse  → ApiResponse
//  sendPaginatedResponse → PaginatedResponse
// ──────────────────────────────────────────────

// Standard backend response envelope
export interface ApiResponse<T = any> {
    success: boolean;
    message?: string;
    data?: T;
}

// Paginated response (from sendPaginatedResponse helper)
export interface PaginatedResponse<T = any> {
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

// Error shape from errorHandler middleware
export interface ApiError {
    statusCode: number;
    message: string;
    error?: string;
    details?: any;
}
