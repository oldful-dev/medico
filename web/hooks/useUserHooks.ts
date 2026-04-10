import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/services/api/apiClient';

export const USER_QUERY_KEYS = {
    profile: ['user', 'profile'] as const,
    addresses: ['user', 'addresses'] as const,
    members: ['user', 'members'] as const,
    bookings: ['user', 'bookings'] as const,
    notifications: ['user', 'notifications'] as const,
};

export const useUserHooks = () => {
    const queryClient = useQueryClient();

    const useProfile = () => {
        return useQuery({
            queryKey: USER_QUERY_KEYS.profile,
            queryFn: async () => {
                const res = await apiClient.get<any>('/users/profile');
                return res.data;
            },
            // High staleTime because user profiles rarely change actively during a session
            staleTime: 10 * 60 * 1000, 
        });
    };

    const useUpdateProfile = () => {
        return useMutation({
            mutationFn: async (data: any) => {
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
                const res = await apiClient.get<any[]>('/bookings/history');
                return res.data;
            },
            enabled: !!apiClient.getToken(),
            staleTime: 5 * 60 * 1000,
        });
    };

    const useNotifications = () => {
        return useQuery({
            queryKey: USER_QUERY_KEYS.notifications,
            queryFn: async () => {
                const res = await apiClient.get<any[]>('/notifications/my');
                return res.data;
            },
            enabled: !!apiClient.getToken(),
            staleTime: 2 * 60 * 1000,
        });
    };

    return {
        useProfile,
        useUpdateProfile,
        useBookings,
        useNotifications,
    };
};
