// ──────────────────────────────────────────────
//  Storage Service — AsyncStorage wrapper
//  Persists auth tokens, user profile, preferences
// ──────────────────────────────────────────────

import AsyncStorage from '@react-native-async-storage/async-storage';

// ─── Storage Keys ─────────────────────────────

export const STORAGE_KEYS = {
    AUTH_TOKEN: 'oldful_auth_token',
    REFRESH_TOKEN: 'oldful_refresh_token',
    USER_PROFILE: 'oldful_user_profile',
    USER_ID: 'oldful_user_id',
    ONBOARDING_COMPLETED: 'oldful_onboarding_completed',
    SELECTED_CITY: 'oldful_selected_city',
    PREFERRED_LANGUAGE: 'oldful_preferred_language',
    PUSH_TOKEN: 'oldful_push_token',
    // Payment recovery — persisted before Razorpay opens, cleared on success/failure
    PENDING_ORDER_ID: 'oldful_pending_order_id',
    PENDING_BOOKING_ID: 'oldful_pending_booking_id',
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

    // ─── Auth-Specific Helpers ───────────────────
    saveAuthTokens: async (accessToken: string, refreshToken: string): Promise<void> => {
        await AsyncStorage.multiSet([
            [STORAGE_KEYS.AUTH_TOKEN, accessToken],
            [STORAGE_KEYS.REFRESH_TOKEN, refreshToken],
        ]);
    },

    getAuthTokens: async (): Promise<{ accessToken: string | null; refreshToken: string | null }> => {
        const pairs = await AsyncStorage.multiGet([
            STORAGE_KEYS.AUTH_TOKEN,
            STORAGE_KEYS.REFRESH_TOKEN,
        ]);
        return {
            accessToken: pairs[0][1],
            refreshToken: pairs[1][1],
        };
    },

    clearAuthTokens: async (): Promise<void> => {
        await AsyncStorage.multiRemove([
            STORAGE_KEYS.AUTH_TOKEN,
            STORAGE_KEYS.REFRESH_TOKEN,
            STORAGE_KEYS.USER_ID,
            STORAGE_KEYS.USER_PROFILE,
        ]);
    },
};
