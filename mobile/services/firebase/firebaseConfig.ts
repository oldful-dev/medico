import { initializeApp } from "firebase/app";
import { getRemoteConfig, fetchAndActivate, getValue } from "firebase/remote-config";
import { getAnalytics, logEvent as fbLogEvent, isSupported as isAnalyticsSupported } from "firebase/analytics";
import { getMessaging, getToken } from "firebase/messaging";
import { Platform } from "react-native";

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

// Helper to safely initialize Firebase services in Expo/React Native environment
const getSafeService = (factory: any, checkFn?: () => Promise<boolean>) => {
    if (!app) return null;
    try {
        // Skip in Expo web environment (no IndexedDB/browser APIs)
        if (Platform.OS === 'web') return null;
        return factory(app);
    } catch (e) {
        console.warn("Firebase service initialization failed:", e);
    }
    return null;
};

const remoteConfig = getSafeService(getRemoteConfig);
let analytics: any = null;
// Only init analytics if supported and not web
if (app && !Platform.OS.includes('web')) {
    isAnalyticsSupported().then(supported => {
        if (supported) {
            try {
                analytics = getAnalytics(app);
            } catch (e) {
                console.warn("Analytics init failed:", e);
            }
        }
    }).catch(() => null);
}
const messaging = getSafeService(getMessaging);



// Default configuration for SDUI
if (remoteConfig) {
    remoteConfig.defaultConfig = {
        home_greeting_message: "Good Morning",
        home_banner_active: true,
        oldful_services_label: "Oldful Services",
    };

    remoteConfig.settings.minimumFetchIntervalMillis = 3600000; // 1 hour
}

export const initRemoteConfig = async () => {
    try {
        if (remoteConfig && app) {
            await fetchAndActivate(remoteConfig);
        }
    } catch (err) {
        // Silently fail in development
    }
};

export const getRemoteValue = (key: string) => {
    if (remoteConfig) {
        return getValue(remoteConfig, key).asString();
    }
    return "";
};

export const logEvent = (eventName: string, params?: object) => {
    if (analytics) {
        fbLogEvent(analytics, eventName, params);
    }
};

export const getFCMToken = async () => {
    try {
        if (messaging && app) {
            return await getToken(messaging, { vapidKey: process.env.EXPO_PUBLIC_FIREBASE_VAPID_KEY ?? "" });
        }
        return null;
    } catch (err) {
        // Silently fail — FCM not available in Expo
        return null;
    }
};


export { app };
