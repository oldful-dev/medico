import { initializeApp } from "firebase/app";
import { getRemoteConfig, fetchAndActivate, getValue } from "firebase/remote-config";
import { getAnalytics, logEvent as fbLogEvent } from "firebase/analytics";
import { getMessaging, getToken } from "firebase/messaging";
import { Platform } from "react-native";

const firebaseConfig = {
    apiKey: "YOUR_API_KEY",
    authDomain: "YOUR_AUTH_DOMAIN",
    projectId: "YOUR_PROJECT_ID",
    storageBucket: "YOUR_STORAGE_BUCKET",
    messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
    appId: "YOUR_APP_ID",
    measurementId: "YOUR_MEASUREMENT_ID"
};

const app = initializeApp(firebaseConfig);

// Helper to check if a service is available to avoid bundle-time crashes
const getSafeService = (factory: any) => {
    try {
        if (typeof window !== 'undefined' || Platform.OS !== 'web') {
            return factory(app);
        }
    } catch (e) {
        console.warn("Firebase service initialization failed:", e);
    }
    return null;
};

const remoteConfig = getSafeService(getRemoteConfig);
const analytics = typeof window !== 'undefined' ? getAnalytics(app) : null;
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
        if (remoteConfig) {
            await fetchAndActivate(remoteConfig);
        }
    } catch (err) {
        console.error("Remote Config Fetch Failed", err);
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
        if (messaging) {
            return await getToken(messaging, { vapidKey: 'YOUR_VAPID_KEY' });
        }
        return null;
    } catch (err) {
        console.error("FCM Token Error", err);
        return null;
    }
};


export { app, remoteConfig, analytics };
