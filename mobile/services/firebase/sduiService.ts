// ──────────────────────────────────────────────────────────────────────────────
//  SDUI Service — Firebase Remote Config
//  Single source of truth for the Home Screen layout.
//
//  Firebase Remote Config key: "home_config" (JSON string)
//
//  Admin can update Firebase Console → Remote Config → home_config → Publish
//  and the home screen will reflect changes without a new app release.
//
//  Architecture:
//    Firebase Remote Config (home_config JSON)
//      └─► sduiService.getHomeConfig()
//            └─► index.tsx renders banners + sections + services
//
//  Assets: Cloudflare CDN  →  https://assets.ayuxacare.com/<file>
//  Use getAssetUrl(fileName) helper — never hardcode full URLs here.
// ──────────────────────────────────────────────────────────────────────────────

import { apiClient } from '../api/apiClient';

// ─── Types ────────────────────────────────────────────────────────────────────


export interface HomeBanner {
    id: string;
    image: string;
    title: string;
    subtitle?: string;
    cta_route?: string;
    enabled: boolean;
    sort_order?: number;
}

/** A single tappable service card inside a section. */
export interface HomeService {
    id: string;
    label: string;
    /** GCS image filename for the card icon/image */
    icon: string;
    /** Expo Router path (e.g. "/doctor-visit") */
    route: string;
    enabled: boolean;
    /** Controls render order within the section */
    sort_order?: number;
}

/** A named group of services (e.g. "Ayuxa Services", "Home Essentials"). */
export interface HomeSection {
    id: string;
    title: string;
    type: 'quick_services' | 'service_grid' | 'essentials_grid';
    enabled: boolean;
    sort_order?: number;
    /** Maximum items to show (rest hidden unless user taps "View All") */
    max_items?: number;
    view_all_route?: string;
    services: HomeService[];
}

/** Trust badge (icon + label strip). */
export interface TrustBadge {
    id: string;
    label: string;
    /** GCS image filename */
    icon: string;
    enabled: boolean;
    sort_order?: number;
}

/** SOS banner config — text and icon only, no section routing. */
export interface SOSBannerConfig {
    enabled: boolean;
    title_line1: string;
    title_line2: string;
    cta_text: string;
    cta_route: string;
    /** GCS image filename for the left icon */
    icon: string;
    /** GCS image filename for the right illustration */
    illustration: string;
}

/** Full home screen config — this is the shape of the "home_config" parameter. */
export interface HomeConfig {
    version: string;
    banners?: HomeBanner[];
    sections: HomeSection[];
    trust_badges: TrustBadge[];
    sos_banner: SOSBannerConfig;
}

// ─── Fallback config ──────────────────────────────────────────────────────────
//  Used when backend config is loading or unavailable (offline, first install, etc.)
//  Image filenames must exist in gs://ayuxa-assets/mobile/assets/images/

export const HOME_CONFIG_FALLBACK: HomeConfig = {
    version: '1.0.0',
    banners: [
        {
            id: 'banner_greeting',
            image: 'banner.png',
            title: 'Your health, our priority',
            subtitle: 'Book a doctor visit in minutes',
            cta_route: '/doctor-visit',
            enabled: true,
        },
    ],
    sections: [
        {
            id: 'quick_services',
            title: 'Quick Services',
            type: 'quick_services',
            enabled: true,
            sort_order: 1,
            services: [
                { id: 'doctor_quick',    label: 'Doctor\nVisit',     icon: 'onlylogo.png', route: '/doctor-visit',  enabled: true,  sort_order: 1 },
                { id: 'nurse_quick',     label: 'Nurse &\nAide',      icon: '21e5a8a8650cf8eda36be3744c70099580173129.png', route: '/nurse-care',    enabled: true,  sort_order: 2 },
                { id: 'hospital_quick',  label: 'Hospital\nVisit',  icon: 'e1baef7b977f856b4e0401f74fbf21e0ce5348f7.png', route: '/hospital-trip', enabled: true,  sort_order: 3 },
                { id: 'physio_quick',    label: 'Physio',          icon: '4ea419052803769fad63ff4292316ce7f8f77dbc.png', route: '/physio-fitness', enabled: true,  sort_order: 4 },
            ],
        },
        {
            id: 'ayuxa_services',
            title: 'Diagnostics & Fitness',
            type: 'service_grid',
            enabled: true,
            sort_order: 2,
            max_items: 6,
            view_all_route: '/all-ayuxa-services',
            services: [
                { id: 'blood_test',     label: 'Blood\nWork',             icon: 'f74321d18a86a9e77628058ed35a50d284752eb2.png', route: '/blood-test',        enabled: true, sort_order: 1 },
                { id: 'scan_ecg',       label: 'Scan &\nECG',             icon: 'scan&ecg.jpg',                              route: '/account/medical-logs',   enabled: true, sort_order: 2 },
                { id: 'medicines',      label: 'Medicine',                icon: '79c15725f6f1a73658b615886f1289634cef9408.png', route: '/order-medicines',   enabled: true, sort_order: 3 },
                { id: 'insurance',      label: 'Insurance',               icon: 'e453f94c7e87531b0da0b6712f8dc4b3bc7084a9.png', route: '/insurance',         enabled: true, sort_order: 4 },
                { id: 'fitness',        label: 'Fitness',                 icon: '54f5c849cf75e776592dec8236f221da3694ca53.png', route: '/physio-fitness',    enabled: true, sort_order: 5 },
                { id: 'equipment',      label: 'Equipment',               icon: 'd3906f517597b2ef10369d92c422b16bf20e879e.png', route: '/medical-equipment', enabled: true, sort_order: 6 },
                { id: 'caregiver',      label: 'Caregiver\nSupport',      icon: '2fb222a5f206ff64415b72a8d4ac9290b4e6f720.png', route: '/nurse-care',        enabled: true, sort_order: 7 },
                { id: 'emergency',      label: 'Emergency\nAssist',       icon: 'e1baef7b977f856b4e0401f74fbf21e0ce5348f7.png', route: '/sos-emergency',     enabled: false, sort_order: 8 },
                { id: 'meal',           label: 'Meal\nService',           icon: '8f136eff1200bb21c080348f6cdb7ad1c2831bdf.png', route: '/meal-service',      enabled: true, sort_order: 9 },
            ],
        },
        {
            id: 'essentials',
            title: 'Home Essentials Services',
            type: 'essentials_grid',
            enabled: true,
            sort_order: 3,
            max_items: 8,
            view_all_route: '/all-home-essentials',
            services: [
                { id: 'ac_repair',     label: 'AC\nRepair',     icon: 'fa6360cf6179cebaed29a6c808bafae2d31ad753.png', route: '/appliance-repair',    enabled: false, sort_order: 1 },
                { id: 'plumbing',      label: 'Plumbing',       icon: '8ce612b04a3a83f1e834c7b71a6dd2c0174cb918.png', route: '/plumbing-electrical', enabled: true, sort_order: 2 },
                { id: 'cleaning',      label: 'Cleaning',       icon: 'ad6b9b061bc7b1487a0e73c2557f711136d2a4d9.png', route: '/deep-cleaning',       enabled: true, sort_order: 3 },
                { id: 'driver',        label: 'Driver',         icon: '60d4d0afa5801aeaa9e593bc049e3b017ef5624c.png', route: '/driving-cab',         enabled: true, sort_order: 4 },
                { id: 'bills',         label: 'Bills',          icon: '056ecb9c01dd2283b1c0db1e84c1eb94c6d8a45a.png', route: '/bill-payment',        enabled: true, sort_order: 5 },
                { id: 'bank',          label: 'Bank\nWork',     icon: '33ede0e57be708b9775957c3ecec7013b0a56c6d.png', route: '/bank-paperwork',      enabled: true, sort_order: 6 },
                { id: 'grocery',       label: 'Gro-\ncery',     icon: '8888c71f466119aa294bd00136ff887f616d4737.png', route: '/grocery-run',         enabled: true, sort_order: 7 },
                { id: 'anything',      label: 'Anything\nElse', icon: '6c8ed456023258e8b4095af93909c6cbc6c4b909.png', route: '/anything-else',       enabled: true, sort_order: 8 },
                { id: 'paper_legal',   label: 'Paper &\nLegal', icon: '33ede0e57be708b9775957c3ecec7013b0a56c6d.png', route: '/paper-legal',         enabled: true, sort_order: 9 },
                { id: 'trip_travel',   label: 'Trip &\nTravel', icon: '60d4d0afa5801aeaa9e593bc049e3b017ef5624c.png', route: '/trip-travels',        enabled: true, sort_order: 10 },
                { id: 'tech_helper',   label: 'Tech\nHelper',   icon: 'fa6360cf6179cebaed29a6c808bafae2d31ad753.png', route: '/tech-helper',         enabled: true, sort_order: 11 },
                { id: 'smart_upgrade', label: 'Smart\nUpgrade', icon: 'ad6b9b061bc7b1487a0e73c2557f711136d2a4d9.png', route: '/smart-upgrade',       enabled: true, sort_order: 12 },
            ],
        },
    ],
    trust_badges: [
        { id: 'support',    label: '24/7 Support',        icon: 'cea3b8dc2ce488942e83a8a4cd0dbe1e6173764b.png', enabled: true, sort_order: 1 },
        { id: 'caregivers', label: 'Verified Caregivers', icon: '4dcdffbd537a1de53d947d7f0c7c548318bc85a7.png', enabled: false, sort_order: 2 },
        { id: 'family',     label: 'Family-first Care',   icon: 'f90ea6c9d084318475183b0a2f11175f0f34640e.png', enabled: true, sort_order: 3 },
    ],
    sos_banner: {
        enabled: true,
        title_line1: 'Need Immediate',
        title_line2: 'Medical Support?',
        cta_text: 'Click here',
        cta_route: '/sos-emergency',
        icon: '5eedb2a89f68f0fea90ef304401e7d38d0fc1790.png',
        illustration: 'e453f94c7e87531b0da0b6712f8dc4b3bc7084a9.png',
    },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

const sortByOrder = <T extends { sort_order?: number }>(arr: T[]): T[] =>
    [...arr].sort((a, b) => (a.sort_order ?? 99) - (b.sort_order ?? 99));

// In-memory cache for home configuration layout
let cachedConfig: HomeConfig | null = null;

// ─── SDUI Service ─────────────────────────────────────────────────────────────

export const sduiService = {
    /**
     * Fetch the home screen layout config from MERN backend.
     */
    async init(): Promise<void> {
        try {
            const res = await apiClient.get<HomeConfig>('/app-config/home');
            if (res.success && res.data) {
                cachedConfig = res.data;
            }
        } catch (err) {
            console.warn('[SDUI] Failed to load layout config from API, using fallback:', err);
        }
    },

    /**
     * Read the full home_config layout.
     * Returns cached config or local fallback config.
     */
    getHomeConfig(): HomeConfig {
        const config = cachedConfig || HOME_CONFIG_FALLBACK;

        // Deep-filter: only enabled sections, services, badges
        return {
            ...config,
            banners: sortByOrder(
                (config.banners ?? HOME_CONFIG_FALLBACK.banners ?? []).filter(b => b.enabled)
            ),
            sections: sortByOrder(
                (config.sections ?? HOME_CONFIG_FALLBACK.sections)
                    .filter(s => s.enabled)
                    .map(section => ({
                        ...section,
                        services: sortByOrder(section.services?.filter(sv => sv.enabled) ?? []),
                    }))
            ),
            trust_badges: sortByOrder(
                (config.trust_badges ?? HOME_CONFIG_FALLBACK.trust_badges).filter(b => b.enabled)
            ),
            sos_banner: config.sos_banner ?? HOME_CONFIG_FALLBACK.sos_banner,
        };
    },
};
