'use client';

import React from 'react';
import { useAuthStore } from '@/store/authStore';
import { Loader2 } from 'lucide-react';
import { DashboardShell } from '@/components/layout/DashboardShell';

/**
 * AppGuard — Prevents authenticated routes from rendering until
 * the session has been hydrated. This prevents "Thundering Herd"
 * network calls where multiple queries fire 401s before the
 * initial refresh has completed.
 */
export function AppGuard({ children }: { children: React.ReactNode }) {
    const { isAuthenticated, isLoading } = useAuthStore();

    if (isLoading) {
        return <DashboardShell />;
    }

    // Note: Middleware handles the redirect to /auth if !isAuthenticated.
    // We just ensure we don't render children while loading.
    return <>{children}</>;
}
