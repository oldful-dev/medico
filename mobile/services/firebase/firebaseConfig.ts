import { initializeApp } from "firebase/app";
import {
    getWebRemoteConfig,
    fetchRC,
    getRCValue,
    isRCSupported,
    getWebAuth,
    webSignInWithCustomToken,
    webSignOut,
} from './webHandlers';

// ─── Firebase App ─────────────────────────────────────────────────────────────

const firebaseConfig = {
    apiKey:            process.env.EXPO_PUBLIC_FIREBASE_API_KEY            ?? "",
    authDomain:        process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN        ?? "",
    projectId:         process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID         ?? "",
    storageBucket:     process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET     ?? "",
    messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID ?? "",
    appId:             process.env.EXPO_PUBLIC_FIREBASE_APP_ID             ?? "",
    measurementId:     process.env.EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID     ?? "",
};

let app: any = null;
if (firebaseConfig.projectId) {
    try {
        app = initializeApp(firebaseConfig);
    } catch (e) {
        console.warn('[Firebase] app init skipped:', e);
    }
}

export { app };

// ─── Remote Config ────────────────────────────────────────────────────────────

let remoteConfig: any = null;

// Single promise — any caller that awaits initRemoteConfig() waits for the
// same in-flight fetch rather than spawning duplicate fetches.
let _initPromise: Promise<void> | null = null;

const RC_DEFAULT_HOME_CONFIG = JSON.stringify({
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
                { id: 'doctor_quick',    label: 'Doctor\nVisit',     icon: '98e939543c86f26f5f26210bb160eb927b5ff057.png', route: '/doctor-visit',  enabled: true,  sort_order: 1 },
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
                { id: 'emergency',      label: 'Emergency\nAssist',       icon: 'e1baef7b977f856b4e0401f74fbf21e0ce5348f7.png', route: '/sos-emergency',     enabled: true, sort_order: 8 },
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
                // 1. Bill Payment
                { id: 'bills',        label: 'Bill\nPayment',              icon: '056ecb9c01dd2283b1c0db1e84c1eb94c6d8a45a.png', route: '/bill-payment',        enabled: true, sort_order: 1 },
                // 2. Tech Help
                { id: 'tech_helper',  label: 'Tech\nHelp',                 icon: 'fa6360cf6179cebaed29a6c808bafae2d31ad753.png', route: '/paper-legal',         enabled: true, sort_order: 2 },
                // 3. Paperwork
                { id: 'bank',         label: 'Paper-\nwork',               icon: '33ede0e57be708b9775957c3ecec7013b0a56c6d.png', route: '/bank-paperwork',      enabled: true, sort_order: 3 },
                // 4. Appliance Repair
                { id: 'ac_repair',    label: 'Appliance\nRepair',          icon: 'fa6360cf6179cebaed29a6c808bafae2d31ad753.png', route: '/appliance-repair',    enabled: true, sort_order: 4 },
                // 5. Deep Cleaning & Pest Control
                { id: 'cleaning',     label: 'Deep Cleaning\n& Pest Ctrl', icon: 'ad6b9b061bc7b1487a0e73c2557f711136d2a4d9.png', route: '/deep-cleaning',       enabled: true, sort_order: 5 },
                // 6. Washroom Sanitation
                { id: 'sanitisation', label: 'Washroom\nSanitation',       icon: '8888c71f466119aa294bd00136ff887f616d4737.png', route: '/sanitisation',        enabled: true, sort_order: 6 },
                // 7. Plumbing & Electrician
                { id: 'plumbing',     label: 'Plumbing &\nElectrician',    icon: '8ce612b04a3a83f1e834c7b71a6dd2c0174cb918.png', route: '/plumbing-electrical', enabled: true, sort_order: 7 },
                // 8. Driver Request
                { id: 'driver',       label: 'Driver\nRequest',            icon: '60d4d0afa5801aeaa9e593bc049e3b017ef5624c.png', route: '/driving-cab',         enabled: true, sort_order: 8 },
            ],
        },
    ],
    trust_badges: [
        { id: 'support',    label: '24/7 Support',        icon: 'cea3b8dc2ce488942e83a8a4cd0dbe1e6173764b.png', enabled: true, sort_order: 1 },
        { id: 'caregivers', label: 'Verified Caregivers', icon: '4dcdffbd537a1de53d947d7f0c7c548318bc85a7.png', enabled: true, sort_order: 2 },
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
});

async function _doInit(): Promise<void> {
    if (!app) {
        console.warn('[RC] ❌ no Firebase app — skipping RC init');
        return;
    }
    try {
        const supported = await isRCSupported();
        console.log('[RC] isRCSupported:', supported);
        if (!supported) return;

        remoteConfig = getWebRemoteConfig(app);
        // Pass fetch interval directly — native RCInstance has no .settings wrapper
        remoteConfig.minimumFetchIntervalMillis = __DEV__ ? 0 : 3600000;
        remoteConfig.defaultConfig = { home_config: RC_DEFAULT_HOME_CONFIG };

        const activated = await fetchRC(remoteConfig);
        console.log('[RC] fetchAndActivate:', activated ? '✅ new values fetched' : '⚠️ using cached');

        // Immediately verify what we got
        const raw: string = getRCValue(remoteConfig, 'home_config').asString();
        console.log('[RC] home_config length:', raw?.length ?? 0);
        if (raw && raw.length > 0) {
            console.log('[RC] home_config preview:', raw.slice(0, 100));
        } else {
            console.warn('[RC] home_config is EMPTY — check Firebase Console → Remote Config → Publish');
        }
    } catch (e: any) {
        console.error('[RC] ❌ init error:', e?.message ?? e);
    }
}

/**
 * Call once on app start (await it before reading any RC values).
 * Safe to call multiple times — returns the same promise.
 */
export const initRemoteConfig = (): Promise<void> => {
    if (!_initPromise) {
        _initPromise = _doInit();
    }
    return _initPromise;
};


/**
 * Read a Remote Config value by key.
 * Returns empty string if RC is not yet initialized.
 */
export const getRemoteValue = (key: string): string => {
    if (!remoteConfig) return '';
    try {
        return getRCValue(remoteConfig, key).asString();
    } catch {
        return '';
    }
};

// ─── Analytics (web-only, no-op on native) ────────────────────────────────────

export const logEvent = (_eventName: string, _params?: object) => {
    // Analytics not supported on native via web SDK — no-op
};

// ─── Firebase Auth ────────────────────────────────────────────────────────────

let firebaseAuth: any = null;
if (app) {
    try {
        firebaseAuth = getWebAuth(app);
    } catch (e) {
        console.warn('[Firebase] Auth init skipped:', e);
    }
}

export const signInWithFirebaseToken = async (customToken: string) => {
    if (firebaseAuth && webSignInWithCustomToken) {
        try {
            const credential = await webSignInWithCustomToken(firebaseAuth, customToken);
            return credential?.user ?? null;
        } catch (err) {
            console.warn('[Firebase] signInWithCustomToken failed:', err);
            return null;
        }
    }
    return null;
};

export const signOutFirebase = async () => {
    if (firebaseAuth && webSignOut) {
        try {
            await webSignOut(firebaseAuth);
        } catch {
            // Silently fail
        }
    }
};

