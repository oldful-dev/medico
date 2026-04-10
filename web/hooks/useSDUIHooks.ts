import { useQuery } from '@tanstack/react-query';
import { sduiService, HomeConfig } from '@/services/firebase/sduiService';

export const SDUI_QUERY_KEYS = {
    homeConfig: ['sdui', 'home'] as const,
};

export const useSDUIHooks = () => {
    const useHomeConfig = () => {
        return useQuery({
            queryKey: SDUI_QUERY_KEYS.homeConfig,
            queryFn: async (): Promise<HomeConfig | null> => {
                await sduiService.init();
                return sduiService.getHomeConfig();
            },
            // SDUI Config rarely changes during a single user session
            staleTime: 60 * 60 * 1000, // 1 hour
            gcTime: 24 * 60 * 60 * 1000, // 24 hours
        });
    };

    return {
        useHomeConfig
    };
};
