import { useEffect, useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { setupPushNotificationListener, requestNotificationPermission } from "@/services/firebase/pushNotificationService";
import { USER_QUERY_KEYS } from "./useUserHooks";
import { useAuthStore } from "@/store/authStore";

/**
 * Hook to setup push notifications
 * Automatically refreshes notification list when push received
 */
export const usePushNotifications = () => {
    const queryClient = useQueryClient();
    const { isAuthenticated } = useAuthStore();

    useEffect(() => {
        if (!isAuthenticated) return;

        // Request permission on first load
        requestNotificationPermission().catch(() => {});

        // Setup listener that invalidates notification cache
        setupPushNotificationListener((payload) => {
            // Refresh notifications list when push received
            queryClient.invalidateQueries({ queryKey: USER_QUERY_KEYS.notifications });
        });
    }, [isAuthenticated, queryClient]);
};
