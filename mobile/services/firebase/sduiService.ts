// ──────────────────────────────────────────────
//  Server-Driven UI Service (Firebase Remote Config)
//  Reads SDUI parameters for dynamic home screen control
//  Per PDF: Use Firebase Remote Config rather than custom backend
// ──────────────────────────────────────────────

import { getRemoteValue, initRemoteConfig } from './firebaseConfig';

// ─── Types ──────────────────────────────────

export interface HeroBanner {
    imageUrl: string;
    label?: string;
    ctaRoute?: string;
    bannerColor?: string;
}

export interface ModulesVisibility {
    essentials: boolean;
    trust_badges: boolean;
    sos_banner: boolean;
    promo_section: boolean;
}

// ─── Helpers ────────────────────────────────

const parseJSON = <T>(raw: string, fallback: T): T => {
    try {
        return raw ? JSON.parse(raw) : fallback;
    } catch {
        return fallback;
    }
};

// ─── Service ────────────────────────────────

export const sduiService = {
    /**
     * Initialize Remote Config (call once on app mount)
     */
    init: initRemoteConfig,

    /**
     * Get greeting message for home screen
     */
    getGreetingMessage: (): string => {
        return getRemoteValue('home_greeting_message') || 'Good Morning';
    },

    /**
     * Get services section label
     */
    getServicesLabel: (): string => {
        return getRemoteValue('oldful_services_label') || 'Oldful Services';
    },

    /**
     * Check if home banner is active
     */
    isBannerActive: (): boolean => {
        const val = getRemoteValue('home_banner_active');
        return val === 'true' || val === '1';
    },

    /**
     * Get hero banners for home screen carousel
     * Admin can swap banners (e.g. "Monsoon Health Checkup") via Remote Config
     */
    getHeroBanners: (): HeroBanner[] => {
        const raw = getRemoteValue('home_hero_banners');
        return parseJSON<HeroBanner[]>(raw, []);
    },

    /**
     * Check if a specific service should be visible
     * Admin can toggle service visibility without app update
     */
    isServiceVisible: (serviceType: string): boolean => {
        const raw = getRemoteValue('service_visibility');
        const visibility = parseJSON<Record<string, boolean>>(raw, {});
        // Default to visible if not specified
        return visibility[serviceType] !== false;
    },

    /**
     * Get overridden service name (for text string changes)
     * Returns null if no override — use default name
     */
    getServiceNameOverride: (serviceType: string): string | null => {
        const raw = getRemoteValue('service_names');
        const names = parseJSON<Record<string, string>>(raw, {});
        return names[serviceType] || null;
    },

    /**
     * Get module visibility settings
     * Controls which home screen sections are shown
     */
    getModulesVisibility: (): ModulesVisibility => {
        const raw = getRemoteValue('modules_visibility');
        return parseJSON<ModulesVisibility>(raw, {
            essentials: true,
            trust_badges: true,
            sos_banner: true,
            promo_section: true,
        });
    },
};
