import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/services/api/apiClient';

export const USER_QUERY_KEYS = {
    profile: ['user', 'profile'] as const,
    addresses: ['user', 'addresses'] as const,
    members: ['user', 'members'] as const,
};

export const useUserHooks = () => {
    const queryClient = useQueryClient();

    const useProfile = () => {
        return useQuery({
            queryKey: USER_QUERY_KEYS.profile,
            queryFn: async () => {
                const res = await apiClient.get<any>('/user/profile');
                return res.data;
            },
            // High staleTime because user profiles rarely change actively during a session
            staleTime: 10 * 60 * 1000, 
        });
    };

    const useUpdateProfile = () => {
        return useMutation({
            mutationFn: async (data: any) => {
                return apiClient.put('/user/profile', data);
            },
            onSuccess: (updatedData) => {
                // Update cache directly to avoid redundant network fetch
                queryClient.setQueryData(USER_QUERY_KEYS.profile, updatedData.data);
            }
        });
    };

    return {
        useProfile,
        useUpdateProfile,
    };
};
