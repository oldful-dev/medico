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

    React.useEffect(() => {
        if (!isLoading && !isAuthenticated) {
            window.location.href = '/auth?reason=unauthorized';
        }
    }, [isLoading, isAuthenticated]);

    if (isLoading || !isAuthenticated) {
        return <DashboardShell />;
    }

    return <>{children}</>;
}
