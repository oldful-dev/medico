import { useCallback } from 'react';
import { useRouter } from 'expo-router';
import { ApiError } from '@/services/api/apiClient';
import { useAuth } from '@/context/AuthContext';

export function useApiWithSessionRedirect() {
    const router = useRouter();
    const auth = useAuth();

    const handleApiError = useCallback(async (error: any): Promise<boolean> => {
        if (error instanceof ApiError && error.isSessionExpired) {
            console.warn('[Session Redirect] Detected session expiry:', error.message);
            // Logout and redirect to login
            await auth.logout();
            router.replace('/(auth)/login');
            return true; // Error was handled
        }
        return false; // Error not handled, should be thrown
    }, [auth, router]);

    // Wrapper for async API calls that auto-redirects on session expiry
    const withSessionRedirect = useCallback(async <T>(
        asyncFn: () => Promise<T>,
        onError?: (error: Error) => void
    ): Promise<T | null> => {
        try {
            return await asyncFn();
        } catch (error) {
            const handled = await handleApiError(error);
            if (handled) return null;
            if (onError) onError(error as Error);
            throw error; // Re-throw if not session-related
        }
    }, [handleApiError]);

    return { handleApiError, withSessionRedirect };
}
