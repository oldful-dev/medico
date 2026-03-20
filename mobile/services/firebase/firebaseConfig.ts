import { initializeApp } from "firebase/app";
import { Platform } from "react-native";
import {
    getWebMessaging,
    getWebToken,
    isMessagingSupported,
    getWebAnalytics,
    logAnalyticsEvent,
    isAnalyticsSupported,
    getWebRemoteConfig,
    fetchRC,
    getRCValue,
    isRCSupported,
    getWebAuth,
    webSignInWithCustomToken,
    webSignOut,
} from './webHandlers';

let remoteConfig: any = null;
let analytics: any = null;
let messaging: any = null;
let getToken: any = getWebToken;
let getValue: any = getRCValue;
let fetchAndActivate: any = fetchRC;
let fbLogEvent: any = logAnalyticsEvent;

const firebaseConfig = {
    apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY ?? "",
    authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN ?? "",
    projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID ?? "",
    storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET ?? "",
    messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID ?? "",
    appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID ?? "",
    measurementId: process.env.EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID ?? "",
};

// Only initialize if we have valid config
let app: any = null;
if (firebaseConfig.projectId) {
    try {
        app = initializeApp(firebaseConfig);
    } catch (e) {
        console.warn("Firebase app initialization skipped (no config)");
    }
}

// ─── Initialize Services Asynchronously ─────────────────
const initServices = async () => {
    if (!app) return;

    try {
        // Remote Config (SDUI — Server-Driven UI via Firebase Remote Config)
        if (await isRCSupported()) {
            remoteConfig = getWebRemoteConfig(app);
            remoteConfig.settings.minimumFetchIntervalMillis = 3600000; // 1 hour
            remoteConfig.defaultConfig = {
                // Text overrides
                home_greeting_message: "Good Morning",
                oldful_services_label: "Oldful Services",
                // Banner control
                home_banner_active: "true",
                home_hero_banners: JSON.stringify([]),
                // Service visibility (JSON: { "DOCTOR_HOME_VISIT": true, ... })
                service_visibility: JSON.stringify({}),
                // Service name overrides (JSON: { "DOCTOR_HOME_VISIT": "Doctor Visit", ... })
                service_names: JSON.stringify({}),
                // Module visibility
                modules_visibility: JSON.stringify({
                    essentials: true,
                    trust_badges: true,
                    sos_banner: true,
                    promo_section: true,
                }),
            };
            await fetchAndActivate(remoteConfig);
        }

        // Analytics
        if (await isAnalyticsSupported()) {
            analytics = getWebAnalytics(app);
        }

        // Messaging
        if (await isMessagingSupported()) {
            messaging = getWebMessaging(app);
        }
    } catch (e) {
        console.warn("Firebase service initialization failed:", e);
    }
};

// Start initialization
initServices();



export const initRemoteConfig = async () => {
    if (remoteConfig) {
        try {
            await fetchAndActivate(remoteConfig);
        } catch (err) {
            // Silently fail
        }
    } else {
        // If not yet loaded, wait a bit or just retry init
        await initServices();
    }
};

export const getRemoteValue = (key: string) => {
    if (remoteConfig && getValue) {
        return getValue(remoteConfig, key).asString();
    }
    return "";
};

export const logEvent = (eventName: string, params?: object) => {
    if (analytics && fbLogEvent) {
        fbLogEvent(analytics, eventName, params);
    }
};

export const getFCMToken = async () => {
    try {
        if (messaging && getToken && app) {
            return await getToken(messaging, { vapidKey: process.env.EXPO_PUBLIC_FIREBASE_VAPID_KEY ?? "" });
        }
        return null;
    } catch (err) {
        // Silently fail — FCM not available in Expo
        return null;
    }
};


// ─── Firebase Auth (Custom Token) ────────────────
let firebaseAuth: any = null;
if (app) {
    try {
        firebaseAuth = getWebAuth(app);
    } catch (e) {
        console.warn("Firebase Auth initialization skipped");
    }
}

export const signInWithFirebaseToken = async (customToken: string) => {
    if (firebaseAuth && webSignInWithCustomToken) {
        try {
            const credential = await webSignInWithCustomToken(firebaseAuth, customToken);
            return credential?.user ?? null;
        } catch (err) {
            console.warn("Firebase signInWithCustomToken failed:", err);
            return null;
        }
    }
    return null;
};

export const signOutFirebase = async () => {
    if (firebaseAuth && webSignOut) {
        try {
            await webSignOut(firebaseAuth);
        } catch (err) {
            // Silently fail
        }
    }
};

export { app };
