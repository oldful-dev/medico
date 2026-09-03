// ──────────────────────────────────────────────
//  Storage Service — AsyncStorage + SecureStore
//  Auth tokens live in SecureStore (OS Keychain/Keystore, encrypted at
//  rest); everything else (profile, preferences, non-sensitive flags)
//  stays in plain AsyncStorage — it was never the risk, and SecureStore's
//  2KB-per-value limit and slower native calls make it a poor fit for
//  larger objects like the cached user profile.
// ──────────────────────────────────────────────

import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';

// ─── Storage Keys ─────────────────────────────

export const STORAGE_KEYS = {
    AUTH_TOKEN: 'ayuxacare_auth_token',
    REFRESH_TOKEN: 'ayuxacare_refresh_token',
    USER_PROFILE: 'ayuxacare_user_profile',
    USER_ID: 'ayuxacare_user_id',
    ONBOARDING_COMPLETED: 'ayuxacare_onboarding_completed',
    SELECTED_CITY: 'ayuxacare_selected_city',
    PREFERRED_LANGUAGE: 'ayuxacare_preferred_language',
    PUSH_TOKEN: 'ayuxacare_push_token',
    // Payment recovery — persisted before Razorpay opens, cleared on success/failure
    PENDING_ORDER_ID: 'ayuxacare_pending_order_id',
    PENDING_BOOKING_ID: 'ayuxacare_pending_booking_id',
    PENDING_ORDER_AT: 'ayuxacare_pending_order_at',
} as const;

// ─── Service ──────────────────────────────────

export const storageService = {
    setItem: async (key: string, value: string): Promise<void> => {
        await AsyncStorage.setItem(key, value);
    },

    getItem: async (key: string): Promise<string | null> => {
        return AsyncStorage.getItem(key);
    },

    removeItem: async (key: string): Promise<void> => {
        await AsyncStorage.removeItem(key);
    },

    clear: async (): Promise<void> => {
        await AsyncStorage.clear();
    },

    // ─── Typed Helpers ───────────────────────────
    setObject: async (key: string, value: any): Promise<void> => {
        await AsyncStorage.setItem(key, JSON.stringify(value));
    },

    getObject: async <T>(key: string): Promise<T | null> => {
        const raw = await AsyncStorage.getItem(key);
        if (!raw) return null;
        try {
            return JSON.parse(raw) as T;
        } catch {
            return null;
        }
    },

    // ─── Auth-Specific Helpers (SecureStore) ─────
    // Generic single-key helper — used when only one of the two tokens
    // needs updating (e.g. after a silent access-token refresh, where the
    // refresh token itself is unchanged).
    setSecureItem: async (key: string, value: string): Promise<void> => {
        await SecureStore.setItemAsync(key, value);
    },

    // SecureStore has no multiSet/multiGet — each key is a separate native
    // call. Two calls at login/refresh time is a negligible cost.
    saveAuthTokens: async (accessToken: string, refreshToken: string): Promise<void> => {
        await Promise.all([
            SecureStore.setItemAsync(STORAGE_KEYS.AUTH_TOKEN, accessToken),
            SecureStore.setItemAsync(STORAGE_KEYS.REFRESH_TOKEN, refreshToken),
        ]);
    },

    getAuthTokens: async (): Promise<{ accessToken: string | null; refreshToken: string | null }> => {
        const [accessToken, refreshToken] = await Promise.all([
            SecureStore.getItemAsync(STORAGE_KEYS.AUTH_TOKEN),
            SecureStore.getItemAsync(STORAGE_KEYS.REFRESH_TOKEN),
        ]);
        return { accessToken, refreshToken };
    },

    clearAuthTokens: async (): Promise<void> => {
        await Promise.all([
            SecureStore.deleteItemAsync(STORAGE_KEYS.AUTH_TOKEN).catch(() => {}),
            SecureStore.deleteItemAsync(STORAGE_KEYS.REFRESH_TOKEN).catch(() => {}),
            AsyncStorage.multiRemove([STORAGE_KEYS.USER_ID, STORAGE_KEYS.USER_PROFILE]),
        ]);
    },

    // One-time migration: earlier app versions stored auth tokens in plain
    // AsyncStorage. On first launch after updating, move them into
    // SecureStore and delete the plaintext copies, so an existing session
    // survives the update without forcing a re-login. Safe to call every
    // launch — it's a no-op once the AsyncStorage copies are gone.
    migrateAuthTokensToSecureStore: async (): Promise<void> => {
        try {
            const [oldAccessToken, oldRefreshToken] = await Promise.all([
                AsyncStorage.getItem(STORAGE_KEYS.AUTH_TOKEN),
                AsyncStorage.getItem(STORAGE_KEYS.REFRESH_TOKEN),
            ]);
            if (!oldAccessToken && !oldRefreshToken) return;

            if (oldAccessToken) await SecureStore.setItemAsync(STORAGE_KEYS.AUTH_TOKEN, oldAccessToken);
            if (oldRefreshToken) await SecureStore.setItemAsync(STORAGE_KEYS.REFRESH_TOKEN, oldRefreshToken);

            await AsyncStorage.multiRemove([STORAGE_KEYS.AUTH_TOKEN, STORAGE_KEYS.REFRESH_TOKEN]);
        } catch {
            // Migration failing shouldn't block app startup — worst case,
            // the user is prompted to log in again via the normal
            // "no token found" path in AuthContext.
        }
    },
};
