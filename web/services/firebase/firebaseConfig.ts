import { initializeApp, getApps, getApp, FirebaseApp } from "firebase/app";
import { getAuth, Auth } from "firebase/auth";
import { getRemoteConfig, fetchAndActivate, getValue } from "firebase/remote-config";
import { getMessaging, Messaging, isSupported } from "firebase/messaging";

// ─── Firebase App ─────────────────────────────────────────────────────────────

const firebaseConfig = {
    apiKey:            process.env.NEXT_PUBLIC_FIREBASE_API_KEY            ?? "",
    authDomain:        process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN        ?? "",
    projectId:         process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID         ?? "",
    storageBucket:     process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET     ?? "",
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID ?? "",
    appId:             process.env.NEXT_PUBLIC_FIREBASE_APP_ID             ?? "",
    measurementId:     process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID     ?? "",
};

export const app: FirebaseApp | null = getApps().length > 0
    ? getApp()
    : (firebaseConfig.apiKey ? initializeApp(firebaseConfig) : null);

export const auth: Auth | null = app ? getAuth(app) : null;
export const remoteConfig = (typeof window !== 'undefined' && app) ? getRemoteConfig(app) : null;

export const messaging: Messaging | null =
    typeof window !== 'undefined' && app
        ? getMessaging(app)
        : null;

// ─── Remote Config ────────────────────────────────────────────────────────────

let _initPromise: Promise<void> | null = null;

async function _doInit(): Promise<void> {
    if (!remoteConfig) return;
    
    try {
        remoteConfig.settings.minimumFetchIntervalMillis = process.env.NODE_ENV === 'development' ? 0 : 3600000;
        await fetchAndActivate(remoteConfig);
    } catch (error) {
        console.error("Failed to initialize remote config:", error);
    }
}

export const initRemoteConfig = (): Promise<void> => {
    if (!_initPromise) {
        _initPromise = _doInit();
    }
    return _initPromise;
};

export const getRemoteValue = (key: string): string => {
    if (!remoteConfig) return '';
    try {
        return getValue(remoteConfig, key).asString();
    } catch {
        return '';
    }
};
