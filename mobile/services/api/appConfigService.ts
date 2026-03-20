// ──────────────────────────────────────────────
//  App Config Service — SDUI (Server-Driven UI)
//  GET /api/app-config  (public, no auth token needed)
// ──────────────────────────────────────────────

import { apiClient, ApiResponse } from './apiClient';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface FeatureFlags {
    sos_enabled: boolean;
    essentials_visible: boolean;
    trust_badges_visible: boolean;
    sos_banner_visible: boolean;
    plans_enabled: boolean;
    insurance_enabled: boolean;
    blood_test_enabled: boolean;
    meal_service_enabled: boolean;
    promo_section_visible: boolean;
}

export interface SectionItem {
    id: string;
    label: string;
    icon_key: string;
    image_url?: string;
    route?: string;
    visible: boolean;
    sort_order: number;
    badge?: string;
}

export interface HomeSection {
    id: string;
    type: 'quick_services' | 'service_grid' | 'trust_badges' | 'sos_banner' | 'essentials_grid';
    title?: string;
    visible: boolean;
    sort_order: number;
    view_all_route?: string;
    config?: Record<string, any>;
    items?: SectionItem[];
}

export interface PlanDuration {
    label: string;
    price: string;
    suffix: string;
}

export interface PlanConfig {
    id: string;
    name: string;
    accent_color: string;
    price_bg_color: string;
    cta_color: string;
    tab_bg: string;
    tab_active_bg: string;
    tab_text_color: string;
    active_duration_label: string;
    durations: PlanDuration[];
    features: string[];
    cta_text: string;
    cta_route: string;
    visible: boolean;
    sort_order: number;
}

export interface PlanBenefit {
    id: string;
    title: string;
    description: string;
    highlight: string;
    icon_key: string;
    sort_order: number;
}

export interface CityConfig {
    id: string;
    name: string;
    state: string;
    available: boolean;
    sort_order: number;
}

export interface LanguageConfig {
    code: string;
    label: string;
    native_label: string;
    sort_order: number;
}

// ─── Doctor Visit Types ───────────────────────────────────────────────────────

export interface DoctorProblem {
    id: string;
    label: string;
    icon_key: string;
    sort_order: number;
    visible: boolean;
}

export interface DoctorType {
    id: string;
    label: string;
    icon_key: string;
    sort_order: number;
    visible: boolean;
}

export interface VisitTypeOption {
    id: string;
    label: string;
    ionicon: string;
    sort_order: number;
    visible: boolean;
}

export interface WhenOption {
    id: string;
    label: string;
    sub_label: string;
    sort_order: number;
}

export interface DoctorVisitConfig {
    title: string;
    sections: any[];
}

// ─── Help & Support Types ─────────────────────────────────────────────────────

export interface FAQ {
    id: string;
    q: string;
    a: string;
    sort_order: number;
}

export interface SupportContact {
    id: string;
    label: string;
    phone: string | null;
    email: string | null;
    name: string | null;
}

export interface TicketCategoryConfig {
    id: string;
    label: string;
    sort_order: number;
}

export interface SupportPromiseItem {
    id: string;
    text: string;
    ionicon: string;
}

export interface HelpSupportConfig {
    phone: string;
    whatsapp_url: string;
    page_description: string;
    contacts: SupportContact[];
    ticket_categories: TicketCategoryConfig[];
    ticket_status_colors: Record<string, string>;
    support_promise: SupportPromiseItem[];
    faqs: FAQ[];
}

// ─── Full App Config ──────────────────────────────────────────────────────────

export interface AppConfig {
    version: string;
    cache_ttl: number;
    feature_flags: FeatureFlags;
    screens: {
        home: {
            sections: HomeSection[];
        };
        plans: {
            banner: { title: string; subtitle: string };
            plans: PlanConfig[];
            benefits: PlanBenefit[];
        };
        city_selection: {
            cities: CityConfig[];
        };
        language_selection: {
            languages: LanguageConfig[];
        };
        doctor_visit: DoctorVisitConfig;
        help_support: HelpSupportConfig;
    };
}

// ─── Service ─────────────────────────────────────────────────────────────────

export const appConfigService = {
    /**
     * GET /api/app-config
     * Fetches the full SDUI config from backend.
     * No auth token required.
     */
    getConfig: async (): Promise<ApiResponse<AppConfig>> => {
        return apiClient.get<AppConfig>('/app-config');
    },
};
