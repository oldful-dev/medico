'use client';

import React from 'react';
import { usePathname } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import { DashboardShell } from '@/components/layout/DashboardShell';

const PUBLIC_APP_ROUTES = ['/app/plans'];

export function AppGuard({ children }: { children: React.ReactNode }) {
    const { isAuthenticated, isLoading } = useAuthStore();
    const pathname = usePathname();

    const isPublic = React.useMemo(() => {
        return PUBLIC_APP_ROUTES.some((r) => pathname === r || pathname?.startsWith(r + '/'));
    }, [pathname]);

    React.useEffect(() => {
        if (!isPublic && !isLoading && !isAuthenticated) {
            window.location.href = '/auth?reason=unauthorized';
        }
    }, [isPublic, isLoading, isAuthenticated]);

    if (!isPublic && (isLoading || !isAuthenticated)) {
        return <DashboardShell />;
    }

    return <>{children}</>;
}
