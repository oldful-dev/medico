import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/services/api/apiClient';
import { useAuthStore } from '@/store/authStore';

export const USER_QUERY_KEYS = {
    profile: ['user', 'profile'] as const,
    addresses: ['user', 'addresses'] as const,
    members: ['user', 'members'] as const,
    bookings: ['user', 'bookings'] as const,
    notifications: ['user', 'notifications'] as const,
};

export const useUserHooks = () => {
    const queryClient = useQueryClient();
    const { isAuthenticated } = useAuthStore();

    const useProfile = () => {
        return useQuery({
            queryKey: USER_QUERY_KEYS.profile,
            queryFn: async () => {
                const res = await apiClient.get<Record<string, unknown>>('/users/profile');
                return res.data;
            },
            enabled: isAuthenticated,
            // High staleTime because user profiles rarely change actively during a session
            staleTime: 10 * 60 * 1000, 
        });
    };

    const useUpdateProfile = () => {
        return useMutation({
            mutationFn: async (data: Record<string, unknown>) => {
                return apiClient.put('/users/profile', data);
            },
            onSuccess: (updatedData) => {
                // Update cache directly to avoid redundant network fetch
                queryClient.setQueryData(USER_QUERY_KEYS.profile, updatedData.data);
            }
        });
    };

    const useBookings = () => {
        return useQuery({
            queryKey: USER_QUERY_KEYS.bookings,
            queryFn: async () => {
                const res = await apiClient.get<Record<string, unknown>[]>('/bookings/history');
                return res.data;
            },
            enabled: isAuthenticated,
            staleTime: 5 * 60 * 1000,
        });
    };

    const useNotifications = () => {
        return useQuery({
            queryKey: USER_QUERY_KEYS.notifications,
            queryFn: async () => {
                const res = await apiClient.get<Record<string, unknown>[]>('/notifications/my');
                return res.data;
            },
            enabled: isAuthenticated,
            staleTime: 2 * 60 * 1000,
        });
    };

    const useMarkNotificationAsRead = () => {
        return useMutation({
            mutationFn: async (id: string) => {
                return apiClient.put(`/notifications/my/${id}/read`, {});
            },
            onMutate: async (id) => {
                await queryClient.cancelQueries({ queryKey: USER_QUERY_KEYS.notifications });
                const previous = queryClient.getQueryData(USER_QUERY_KEYS.notifications);
                queryClient.setQueryData(USER_QUERY_KEYS.notifications, (old: any) => 
                    old?.map((n: any) => n.id === id ? { ...n, isRead: true } : n)
                );
                return { previous };
            },
            onError: (err, id, context: any) => {
                if (context?.previous) queryClient.setQueryData(USER_QUERY_KEYS.notifications, context.previous);
            },
            onSettled: () => {
                queryClient.invalidateQueries({ queryKey: USER_QUERY_KEYS.notifications });
            }
        });
    };

    const useMarkAllNotificationsAsRead = () => {
        return useMutation({
            mutationFn: async () => {
                return apiClient.put('/notifications/my/read-all', {});
            },
            onMutate: async () => {
                await queryClient.cancelQueries({ queryKey: USER_QUERY_KEYS.notifications });
                const previous = queryClient.getQueryData(USER_QUERY_KEYS.notifications);
                queryClient.setQueryData(USER_QUERY_KEYS.notifications, (old: any) => 
                    old?.map((n: any) => ({ ...n, isRead: true }))
                );
                return { previous };
            },
            onError: (err, variables, context: any) => {
                if (context?.previous) queryClient.setQueryData(USER_QUERY_KEYS.notifications, context.previous);
            },
            onSettled: () => {
                queryClient.invalidateQueries({ queryKey: USER_QUERY_KEYS.notifications });
            }
        });
    };

    const useCancelBooking = () => {
        return useMutation({
            mutationFn: async (id: string) => {
                return apiClient.post(`/bookings/${id}/cancel`, {});
            },
            onSuccess: () => {
                queryClient.invalidateQueries({ queryKey: USER_QUERY_KEYS.bookings });
            }
        });
    };

    return {
        useProfile,
        useUpdateProfile,
        useBookings,
        useNotifications,
        useMarkNotificationAsRead,
        useMarkAllNotificationsAsRead,
        useCancelBooking,
    };
};
