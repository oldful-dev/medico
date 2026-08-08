// Banner Service — Fetch home screen banners from admin API
// Not tied to Firebase SDUI — full CRUD managed via admin panel

import { apiClient } from './apiClient';

export interface Banner {
  id: string;
  imageUrl: string;         // Full HTTPS URL or CDN link
  heading: string;          // Main title (max 60 chars)
  subheading: string;       // Description (max 80 chars)
  ctaText?: string;         // Button text (max 30 chars)
  ctaRoute?: string;        // Deep-link route (e.g., "/travel-inquiry")
  category?: string;        // Screen target category (e.g., "HOME", "WELLNESS")
  order: number;            // Sort order (ascending)
  isActive: boolean;        // Show/hide flag
  createdAt: string;
  updatedAt: string;
}

export interface BannerListResponse {
  success: boolean;
  data: Banner[];
  total?: number;
}

export interface BannerResponse {
  success: boolean;
  data: Banner;
}

class BannerService {
  private lastFetchTime = 0;
  private cachedBanners: Banner[] = [];
  private THROTTLE_MS = 24 * 60 * 60 * 1000; // 24 Hours refresh interval

  /**
   * Get all active banners for home screen
   * @returns Array of banners ordered by sort position
   */
  async getHomeBanners(force = false): Promise<Banner[]> {
    const now = Date.now();
    if (!force && this.cachedBanners.length > 0 && (now - this.lastFetchTime < this.THROTTLE_MS)) {
      return this.cachedBanners;
    }
    try {
      const response = await apiClient.get<Banner[]>('/banners/home');
      if (response.success && Array.isArray(response.data)) {
        return this.cachedBanners;
      }
      return this.cachedBanners;
    } catch (error) {
      console.error('Failed to fetch home banners:', error);
      return this.cachedBanners;
    }
  }

  /**
   * Clear in-memory banner cache
   */
  clearCache(): void {
    this.cachedBanners = [];
    this.lastFetchTime = 0;
    console.log('[BannerService] 🧹 Banner cache cleared');
  }

  /**
   * Get all active banners for the wellness store
   */
  async getWellnessBanners(): Promise<Banner[]> {
    try {
      const response = await apiClient.get<Banner[]>('/wellness/banners');
      if (response.success && Array.isArray(response.data)) {
        return response.data.sort((a, b) => a.order - b.order);
      }
      return [];
    } catch (error) {
      console.error('Failed to fetch wellness banners:', error);
      return [];
    }
  }

  /**
   * Get banner by ID
   */
  async getBannerById(id: string): Promise<Banner | null> {
    try {
      const response = await apiClient.get<Banner>(`/banners/${id}`);
      return (response.success && response.data) ? response.data : null;
    } catch (error) {
      console.error(`Failed to fetch banner ${id}:`, error);
      return null;
    }
  }

  /**
   * Get all banners (admin only)
   */
  async getAllBanners(params?: {
    page?: number;
    limit?: number;
    isActive?: boolean;
  }): Promise<BannerListResponse> {
    try {
      const queryParts: string[] = [];
      if (params) {
        if (params.page !== undefined) queryParts.push(`page=${params.page}`);
        if (params.limit !== undefined) queryParts.push(`limit=${params.limit}`);
        if (params.isActive !== undefined) queryParts.push(`isActive=${params.isActive}`);
      }
      const queryString = queryParts.join('&');
      const endpoint = `/banners${queryString ? `?${queryString}` : ''}`;
      
      const response = await apiClient.get<Banner[]>(endpoint);
      if (response.success && Array.isArray(response.data)) {
        return {
          success: true,
          data: response.data,
          total: (response as any).total ?? response.data.length,
        };
      }
      return { success: false, data: [] };
    } catch (error) {
      console.error('Failed to fetch banners:', error);
      return { success: false, data: [] };
    }
  }

  /**
   * Create a new banner (admin only)
   */
  async createBanner(data: Omit<Banner, 'id' | 'createdAt' | 'updatedAt'>): Promise<Banner | null> {
    try {
      const response = await apiClient.post<Banner>('/banners', data);
      return (response.success && response.data) ? response.data : null;
    } catch (error) {
      console.error('Failed to create banner:', error);
      return null;
    }
  }

  /**
   * Update a banner (admin only)
   */
  async updateBanner(id: string, data: Partial<Omit<Banner, 'id' | 'createdAt' | 'updatedAt'>>): Promise<Banner | null> {
    try {
      const response = await apiClient.put<Banner>(`/banners/${id}`, data);
      return (response.success && response.data) ? response.data : null;
    } catch (error) {
      console.error(`Failed to update banner ${id}:`, error);
      return null;
    }
  }

  /**
   * Delete a banner (admin only)
   */
  async deleteBanner(id: string): Promise<boolean> {
    try {
      const response = await apiClient.delete<{ success: boolean }>(`/banners/${id}`);
      return response.success;
    } catch (error) {
      console.error(`Failed to delete banner ${id}:`, error);
      return false;
    }
  }

  /**
   * Toggle banner active status (admin only)
   */
  async toggleBannerStatus(id: string, isActive: boolean): Promise<Banner | null> {
    try {
      const response = await apiClient.patch<Banner>(`/banners/${id}/toggle`, { isActive });
      return (response.success && response.data) ? response.data : null;
    } catch (error) {
      console.error(`Failed to toggle banner ${id}:`, error);
      return null;
    }
  }

  /**
   * Reorder banners (admin only)
   */
  async reorderBanners(banners: Array<{ id: string; order: number }>): Promise<boolean> {
    try {
      const response = await apiClient.post<{ success: boolean }>('/banners/reorder', { banners });
      return response.success;
    } catch (error) {
      console.error('Failed to reorder banners:', error);
      return false;
    }
  }
}

export const bannerService = new BannerService();
