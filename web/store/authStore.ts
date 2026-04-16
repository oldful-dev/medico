// ──────────────────────────────────────────────
//  Auth Store — Global authentication state
//  Mirrors mobile AuthContext behavior exactly:
//
//  Mobile:                     Web:
//  AsyncStorage (tokens)   →   httpOnly cookies (via Next.js API routes)
//  apiClient.setAuthToken  →   apiClient.setToken (same pattern)
//  In-memory state         →   Zustand state
//  Boot: read AsyncStorage →   Boot: AuthInitializer component (see below)
// ──────────────────────────────────────────────

import { create } from 'zustand';
import { apiClient } from '@/services/api/apiClient';

import { Address } from '@/services/api/userService';

export interface AuthUser {
    id: string;
    name: string;
    phone: string;
    email?: string;
    profileImageUrl?: string;
    uniqueUserId?: string;
    addresses?: Address[];
}

interface AuthState {
    isAuthenticated: boolean;
    isLoading: boolean;
    user: AuthUser | null;

    // Actions — mirrors mobile AuthContext
    login: (accessToken: string, refreshToken: string, user: AuthUser) => Promise<void>;
    logout: () => Promise<void>;
    initialize: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
    isAuthenticated: false,
    isLoading: true,
    user: null,

    // ─── Login ────────────────────────────────────────────────────────────
    // Mirrors mobile: storageService.saveAuthTokens + apiClient.setAuthToken
    login: async (accessToken: string, refreshToken: string, user: AuthUser) => {
        // 1. Persist tokens to httpOnly cookies on Next.js domain
        //    (mirrors mobile's storageService.saveAuthTokens)
        try {
            await fetch('/api/auth/set-session', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ accessToken, refreshToken }),
            });
        } catch (err) {
            console.error('[Auth] Failed to set session cookies:', err);
        }

        // 2. Set in-memory token (mirrors mobile's apiClient.setAuthToken)
        apiClient.setToken(accessToken);

        // 3. Register auth failure callback (mirrors mobile's setAuthFailureCallback)
        apiClient.setAuthFailureCallback(() => {
            set({ isAuthenticated: false, user: null, isLoading: false });
            // Use replace to prevent back-navigation to expired session
            if (typeof globalThis.location !== 'undefined') {
                globalThis.location.replace('/auth?reason=session_expired');
            }
        });

        // 4. Fetch full profile to ensure consistency (e.g. profile picture)
        let fullUser = user;
        try {
            const profileRes = await fetch('/api/auth/me');
            const profileData = await profileRes.json();
            if (profileRes.ok && profileData.success && profileData.data) {
                fullUser = profileData.data as AuthUser;
            }
        } catch (err) {
            console.warn('[Auth] Post-login profile sync failed:', err);
        }

        // 5. Update Zustand state
        set({ isAuthenticated: true, user: fullUser, isLoading: false });
    },

    // ─── Logout ───────────────────────────────────────────────────────────
    // Mirrors mobile: POST /auth/logout + clear tokens + clear state
    logout: async () => {
        try {
            await fetch('/api/auth/logout', { method: 'POST' });
        } catch (err) {
            console.error('[Auth] Logout API error:', err);
        } finally {
            apiClient.clearToken();
            set({ isAuthenticated: false, user: null, isLoading: false });
            if (typeof globalThis.location !== 'undefined') {
                globalThis.location.replace('/auth');
            }
        }
    },

    // ─── Initialize (Session Hydration on Boot) ───────────────────────────
    // Called by AuthInitializer component (client-only, inside useEffect).
    // Mirrors mobile's boot useEffect:
    //   storageService.getAuthTokens() → apiClient.setAuthToken() → setState
    initialize: async () => {
        set({ isLoading: true });
        try {
            // Step 1: Exchange refresh cookie for a new access token
            const refreshRes = await fetch('/api/auth/refresh', { method: 'POST' });
            const refreshData = await refreshRes.json();

            if (!refreshRes.ok || !refreshData.success || !refreshData.data?.accessToken) {
                // No valid session — user is a guest
                set({ isAuthenticated: false, user: null, isLoading: false });
                return;
            }

            const accessToken = refreshData.data.accessToken;

            // Step 2: Hydrate apiClient (mirrors mobile: apiClient.setAuthToken)
            apiClient.setToken(accessToken);

            // Step 3: Register callbacks
            apiClient.setAuthFailureCallback(() => {
                set({ isAuthenticated: false, user: null, isLoading: false });
                if (typeof globalThis.location !== 'undefined') {
                    globalThis.location.replace('/auth?reason=session_expired');
                }
            });

            // Step 4: Fetch user profile using auth-token cookie
            const profileRes = await fetch('/api/auth/me');
            const profileData = await profileRes.json();

            if (profileRes.ok && profileData.success && profileData.data) {
                set({
                    isAuthenticated: true,
                    user: profileData.data as AuthUser,
                    isLoading: false,
                });
            } else {
                // Access token is valid but profile unavailable — still mark as authenticated
                set({ isAuthenticated: true, user: null, isLoading: false });
            }
        } catch (err) {
            console.error('[Auth] Initialization failed:', err);
            set({ isAuthenticated: false, user: null, isLoading: false });
        }
    },
}));
