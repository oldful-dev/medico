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
     */
    getProducts: async (): Promise<ApiResponse<Product[]>> => {
        return apiClient.get<Product[]>('/products');
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
