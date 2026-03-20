// ──────────────────────────────────────────────
//  UI Config Service — Server-Driven UI (Legacy)
//  DEPRECATED: Use sduiService (Firebase Remote Config) instead.
//  This custom backend API is retained for backward compatibility.
//  GET /api/ui-config/published   (fetch published UI configs)
// ──────────────────────────────────────────────

import { apiClient, ApiResponse } from './apiClient';

// ─── Types (aligned with Prisma UIConfig model) ──

export type UIConfigType = 'HOME_BANNER' | 'SERVICE_CARD' | 'PROMO_SECTION' | 'CATEGORY_STRIP' | 'CUSTOM';

export interface UIConfig {
    id: string;
    type: UIConfigType;
    key: string;               // unique lookup key
    label: string;
    iconUrl?: string;
    heroImageUrl?: string;
    bannerColor?: string;
    ctaText?: string;
    ctaRoute?: string;         // deep link route
    configJson?: Record<string, any>;
    sortOrder: number;
    isVisible: boolean;
    version: number;
}

// ─── Service ──────────────────────────────────

export const uiConfigService = {
    /**
     * GET /api/ui-config/published
     * Fetch all published UI configs to render dynamic sections.
     */
    getPublishedConfigs: async (): Promise<ApiResponse<UIConfig[]>> => {
        return apiClient.get<UIConfig[]>('/ui-config/published');
    },
};
