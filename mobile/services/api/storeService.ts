// ──────────────────────────────────────────────
//  Wellness Store Service — Products & Categories
//  GET /api/products             (list products)
//  GET /api/products/:id         (product detail)
//  GET /api/categories           (list categories)
//  POST /api/products/:id/waitlist (join waitlist)
// ──────────────────────────────────────────────

import { apiClient, ApiResponse } from './apiClient';

// ─── Types (aligned with Prisma schema) ───────

export interface Product {
    id: string;
    name: string;
    description?: string;
    imageUrl?: string;
    price: number;
    mrp: number;
    stock: number;
    isEnabled: boolean;
    categoryId: string;
    category?: ProductCategory;
}

export interface ProductCategory {
    id: string;
    name: string;
    slug: string;
    imageUrl?: string;
    sortOrder: number;
    isEnabled: boolean;
}

// ─── Service ──────────────────────────────────

export const storeService = {
    /**
     * GET /api/products
     * Optional params: isEnabled, categoryId, limit, search
     */
    getProducts: async (params?: { isEnabled?: boolean; categoryId?: string; limit?: number; search?: string }): Promise<ApiResponse<Product[]>> => {
        const qs = new URLSearchParams();
        if (params?.isEnabled !== undefined) qs.set('isEnabled', String(params.isEnabled));
        if (params?.categoryId) qs.set('categoryId', params.categoryId);
        if (params?.limit) qs.set('limit', String(params.limit));
        if (params?.search) qs.set('search', params.search);
        const query = qs.toString();
        return apiClient.get<Product[]>(query ? `/products?${query}` : '/products');
    },

    /**
     * GET /api/products/:id
     */
    getProductById: async (productId: string): Promise<ApiResponse<Product>> => {
        return apiClient.get<Product>(`/products/${productId}`);
    },

    /**
     * GET /api/categories
     */
    getCategories: async (): Promise<ApiResponse<ProductCategory[]>> => {
        return apiClient.get<ProductCategory[]>('/categories');
    },

    /**
     * POST /api/products/:id/waitlist
     * Join the waitlist for an out-of-stock product.
     */
    joinWaitlist: async (productId: string): Promise<ApiResponse> => {
        return apiClient.post(`/products/${productId}/waitlist`);
    },
};
