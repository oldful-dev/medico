// ──────────────────────────────────────────────
//  Wellness Store Service — Products, Categories & Orders
//  GET    /api/products               (list products)
//  GET    /api/products/:id           (product detail)
//  GET    /api/categories             (list categories)
//  POST   /api/products/:id/waitlist  (join waitlist)
//  POST   /api/orders/checkout        (multi-item cart checkout)
//  POST   /api/orders/shipping-rate   (get shipping estimate)
//  GET    /api/orders/my-orders       (user's product orders)
//  GET    /api/orders/:id/tracking    (live tracking)
// ──────────────────────────────────────────────

import { apiClient, ApiResponse } from './apiClient';

// ─── Types (aligned with Prisma schema) ───────

export interface Product {
    id: string;
    name: string;
    description?: string;
    imageUrl?: string;
    images?: string[];
    price: number;
    mrp: number;
    stock: number;
    isEnabled: boolean;
    categoryId: string;
    category?: ProductCategory;
    sku?: string;
    weight?: number;
    length?: number;
    width?: number;
    height?: number;
    rating?: number;
}

export interface ProductCategory {
    id: string;
    name: string;
    slug: string;
    imageUrl?: string;
    sortOrder: number;
    isEnabled: boolean;
}

export interface CartItem {
    productId: string;
    quantity: number;
}

export interface OrderLineItem {
    productId: string;
    quantity: number;
    name?: string;
    price?: number;
    sku?: string;
    mrp?: number;
    lineTotal?: number;
    weight?: number;
    length?: number;
    width?: number;
    height?: number;
    imageUrl?: string;
}

export interface TrackingActivity {
    date: string;
    activity: string;
    location: string;
    status: string;
}

export interface TrackingData {
    awbCode: string;
    currentStatus: string;
    deliveredDate?: string;
    etd?: string;
    courierName: string;
    activities: TrackingActivity[];
}

export interface ProductOrder {
    id: string;
    orderCode: string;
    userId: string;
    productId?: string;
    quantity: number;
    amount: number;
    subtotal: number;
    tax: number;
    shippingCharge: number;
    discount: number;
    address?: string;
    status: 'PENDING' | 'PAID' | 'CONFIRMED' | 'ACCEPTED' | 'DELIVERY_CREATED' | 'PICKUP_ASSIGNED' | 'PICKED_UP' | 'DISPATCHED' | 'IN_TRANSIT' | 'DELIVERED' | 'RETURNED' | 'CANCELLED';
    shippingStatus?: string;
    trackingStatus?: string;
    awbCode?: string;
    courierName?: string;
    trackingUrl?: string;
    trackingData?: TrackingData;
    shiprocketOrderId?: string;
    shipmentId?: string;
    items?: OrderLineItem[];
    product?: Pick<Product, 'id' | 'name' | 'imageUrl'>;
    user?: {
        name: string;
        phone: string;
        email: string;
    };
    createdAt: string;
    updatedAt: string;
}

export interface ShippingRate {
    available: boolean;
    rate: number;
    courierName: string;
    estimatedDays: string;
    allRates?: Array<{
        courierId: number;
        courierName: string;
        rate: number;
        estimatedDays: number;
        cod: boolean;
    }>;
}

export interface CheckoutBreakdown {
    subtotal: number;
    tax: number;
    shippingCharge: number;
    totalAmount: number;
}

// ─── Service ──────────────────────────────────

export const storeService = {
    /**
     * GET /api/products
     * Optional params: isEnabled, categoryId, limit, search
     */
    getProducts: async (params?: {
        isEnabled?: boolean;
        categoryId?: string;
        limit?: number;
        search?: string;
    }): Promise<ApiResponse<Product[]>> => {
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

    /**
     * POST /api/orders/shipping-rate
     * Estimate shipping cost before checkout.
     */
    getShippingRate: async (payload: {
        pincode: string;
        items: CartItem[];
        paymentMethod?: string;
    }): Promise<ApiResponse<ShippingRate>> => {
        return apiClient.post<ShippingRate>('/orders/shipping-rate', payload);
    },

    /**
     * POST /api/orders/checkout
     * Create a ProductOrder for a multi-item cart.
     * Returns the order with server-computed breakdown to be passed to payment.
     */
    checkoutCart: async (payload: {
        items: CartItem[];
        addressId?: string;
        address?: string;
        pincode?: string;
        paymentMethod?: string;
    }): Promise<ApiResponse<{ order: ProductOrder; breakdown: CheckoutBreakdown }>> => {
        return apiClient.post<{ order: ProductOrder; breakdown: CheckoutBreakdown }>(
            '/orders/checkout',
            payload,
        );
    },

    /**
     * GET /api/orders/my-orders
     * Returns paginated list of the user's product orders.
     */
    getMyOrders: async (params?: { page?: number; limit?: number }): Promise<ApiResponse<ProductOrder[]>> => {
        const qs = new URLSearchParams();
        if (params?.page) qs.set('page', String(params.page));
        if (params?.limit) qs.set('limit', String(params.limit));
        const query = qs.toString();
        return apiClient.get<ProductOrder[]>(query ? `/orders/my-orders?${query}` : '/orders/my-orders');
    },

    /**
     * GET /api/orders/:id/tracking
     * Get live Delhivery tracking for a product order.
     */
    getOrderTracking: async (orderId: string): Promise<ApiResponse<{
        order: ProductOrder;
        tracking: TrackingData | null;
    }>> => {
        return apiClient.get(`/orders/${orderId}/tracking`);
    },

    // ─── Legacy single-product order (kept for backward compat) ──────────────
    /**
     * POST /api/products/:id/order  (legacy — use checkoutCart for new flows)
     */
    createOrder: async (
        productId: string,
        payload: { quantity?: number; address?: string },
    ): Promise<ApiResponse<ProductOrder>> => {
        return apiClient.post<ProductOrder>(`/products/${productId}/order`, payload);
    },
};
