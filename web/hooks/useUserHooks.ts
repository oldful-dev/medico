import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '@/store/authStore';
import { userService, UserProfile, Booking } from '@/services/api/userService';
import { notificationService, Notification } from '@/services/api/notificationService';

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
                const res = await userService.getProfile();
                return res.data;
            },
            enabled: isAuthenticated,
            staleTime: 10 * 60 * 1000, 
        });
    };

    const useUpdateProfile = () => {
        return useMutation({
            mutationFn: async (data: Partial<UserProfile>) => {
                return userService.updateProfile(data);
            },
            onSuccess: (updatedData) => {
                queryClient.setQueryData(USER_QUERY_KEYS.profile, updatedData.data);
            }
        });
    };

    const useBookings = () => {
        return useQuery({
            queryKey: USER_QUERY_KEYS.bookings,
            queryFn: async () => {
                const res = await userService.getMyBookings();
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
                const res = await notificationService.getNotifications();
                return res.data;
            },
            enabled: isAuthenticated,
            staleTime: 2 * 60 * 1000,
        });
    };

    const useMarkNotificationAsRead = () => {
        return useMutation({
            mutationFn: async (id: string) => {
                return notificationService.markAsRead(id);
            },
            onMutate: async (id) => {
                await queryClient.cancelQueries({ queryKey: USER_QUERY_KEYS.notifications });
                const previous = queryClient.getQueryData<Notification[]>(USER_QUERY_KEYS.notifications);
                queryClient.setQueryData(USER_QUERY_KEYS.notifications, (old: Notification[] | undefined) => 
                    old?.map((n) => n.id === id ? { ...n, isRead: true } : n)
                );
                return { previous };
            },
            onError: (err, id, context: { previous?: Notification[] } | undefined) => {
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
                return notificationService.markAllAsRead();
            },
            onMutate: async () => {
                await queryClient.cancelQueries({ queryKey: USER_QUERY_KEYS.notifications });
                const previous = queryClient.getQueryData<Notification[]>(USER_QUERY_KEYS.notifications);
                queryClient.setQueryData(USER_QUERY_KEYS.notifications, (old: Notification[] | undefined) => 
                    old?.map((n) => ({ ...n, isRead: true }))
                );
                return { previous };
            },
            onError: (err, variables, context: { previous?: Notification[] } | undefined) => {
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
                return userService.cancelBooking(id);
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
