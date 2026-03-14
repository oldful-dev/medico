import { initializeApp } from "firebase/app";
import { getRemoteConfig, fetchAndActivate, getValue } from "firebase/remote-config";
import { getAnalytics, logEvent as fbLogEvent } from "firebase/analytics";
import { getMessaging, getToken } from "firebase/messaging";

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
const remoteConfig = getRemoteConfig(app);
const analytics = typeof window !== 'undefined' ? getAnalytics(app) : null;

// Default configuration for SDUI
remoteConfig.defaultConfig = {
    home_greeting_message: "Good Morning",
    home_banner_active: true,
    oldful_services_label: "Oldful Services",
};

remoteConfig.settings.minimumFetchIntervalMillis = 3600000; // 1 hour

export const initRemoteConfig = async () => {
    try {
        await fetchAndActivate(remoteConfig);
    } catch (err) {
        console.error("Remote Config Fetch Failed", err);
    }
};

export const getRemoteValue = (key: string) => {
    return getValue(remoteConfig, key).asString();
};

export const logEvent = (eventName: string, params?: object) => {
    if (analytics) {
        fbLogEvent(analytics, eventName, params);
    }
};

export const getFCMToken = async () => {
    try {
        const messaging = getMessaging(app);
        return await getToken(messaging, { vapidKey: 'YOUR_VAPID_KEY' });
    } catch (err) {
        console.error("FCM Token Error", err);
        return null;
    }
};

export { app, remoteConfig, analytics };
