'use client';

import { useEffect } from 'react';
import { useAuthStore } from '@/store/authStore';

/**
 * AuthInitializer — Mirrors mobile AuthContext's boot useEffect.
 *
 * Mobile: useEffect → storageService.getAuthTokens() → apiClient.setAuthToken()
 * Web:    useEffect → /api/auth/refresh (reads cookie) → apiClient.setToken()
 *
 * Must be rendered inside the root layout (client boundary), runs once on mount.
 * Safe: only runs on the client, never during SSR/SSG.
 */
export function AuthInitializer() {
    const initialize = useAuthStore((state) => state.initialize);

    useEffect(() => {
        // Prevent infinite loops: skip initialization if already on the auth page
        if (typeof window !== 'undefined' && window.location.pathname === '/auth') {
            return;
        }

        initialize();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []); // Empty deps — run once on mount, like mobile's boot useEffect

    return null; // Renders nothing — pure side-effect component
}
