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
            image: '63e6c29e1ee4daac9d964f5b379bfa5d992c8dec.png',
            title: 'Your health, our priority',
            enabled: true,
        },
    ],
    sections: [],
    trust_badges: [],
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

