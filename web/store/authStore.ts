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
            const refreshRes = await fetch('/api/auth/refresh', { method: 'POST' });
            
            // Safety check: if response is not JSON or not OK (e.g. 404 HTML), handle gracefully
            if (!refreshRes.ok) {
                console.warn('[Auth] Session refresh failed (status:', refreshRes.status, ')');
                // If it's 401/404/500, we should ensure cookies are cleared to prevent middleware loops
                await fetch('/api/auth/logout', { method: 'POST' }).catch(() => null);
                set({ isAuthenticated: false, user: null, isLoading: false });
                return;
            }

            const refreshData = await refreshRes.json().catch(() => null);

            if (!refreshData || !refreshData.success || !refreshData.data?.accessToken) {
                // Invalid session response — clear cookies via logout just in case
                await fetch('/api/auth/logout', { method: 'POST' }).catch(() => null);
                set({ isAuthenticated: false, user: null, isLoading: false });
                return;
            }

            const accessToken = refreshData.data.accessToken;
            apiClient.setToken(accessToken);

            apiClient.setAuthFailureCallback(() => {
                set({ isAuthenticated: false, user: null, isLoading: false });
                if (typeof globalThis.location !== 'undefined') {
                    globalThis.location.replace('/auth?reason=session_expired');
                }
            });

            const profileRes = await fetch('/api/auth/me');
            const profileData = await profileRes.json().catch(() => null);

            if (profileRes.ok && profileData?.success && profileData?.data) {
                set({
                    isAuthenticated: true,
                    user: profileData.data as AuthUser,
                    isLoading: false,
                });
            } else {
                set({ isAuthenticated: true, user: null, isLoading: false });
            }
        } catch (err) {
            console.error('[Auth] Initialization network/parsing error:', err);
            // On catastrophic failure, clear state to guest
            set({ isAuthenticated: false, user: null, isLoading: false });
        }
    },
}));
