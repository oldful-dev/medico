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
  /**
   * Get all active banners for home screen
   * @returns Array of banners ordered by sort position
   */
  async getHomeBanners(): Promise<Banner[]> {
    try {
      const response = await apiClient.get<BannerListResponse>('/banners/home');
      if (response.success && Array.isArray(response.data)) {
        return response.data.sort((a, b) => a.order - b.order);
      }
      return [];
    } catch (error) {
      console.error('Failed to fetch home banners:', error);
      return [];
    }
  }

  /**
   * Get banner by ID
   */
  async getBannerById(id: string): Promise<Banner | null> {
    try {
      const response = await apiClient.get<BannerResponse>(`/banners/${id}`);
      return response.success ? response.data : null;
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
      const response = await apiClient.get<BannerListResponse>('/banners', { params });
      return response;
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
      const response = await apiClient.post<BannerResponse>('/banners', data);
      return response.success ? response.data : null;
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
      const response = await apiClient.put<BannerResponse>(`/banners/${id}`, data);
      return response.success ? response.data : null;
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
      const response = await apiClient.patch<BannerResponse>(`/banners/${id}/toggle`, { isActive });
      return response.success ? response.data : null;
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
