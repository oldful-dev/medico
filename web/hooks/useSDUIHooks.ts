import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/services/api/apiClient';
import { HomeConfig } from '@/services/firebase/sduiService';

export const SDUI_QUERY_KEYS = {
    homeConfig: ['sdui', 'home'] as const,
};

export const useSDUIHooks = () => {
    const useHomeConfig = () => {
        return useQuery({
            queryKey: SDUI_QUERY_KEYS.homeConfig,
            queryFn: async (): Promise<HomeConfig | null> => {
                try {
                    const res = await apiClient.get<any>('/app-config/home');
                    if (res && res.data) {
                        // Translate backend home config structure to match website's HomeConfig schema
                        // Sometimes res.data is wrapped inside res.data.data
                        const backendConfig = res.data.sections ? res.data : (res.data.data || res.data);
                        
                        // Sections normalization mapping
                        const sections = (backendConfig.sections || []).map((sec: any) => {
                            // Extract items list
                            const services = (sec.items || []).map((item: any) => {
                                // Parse label if it is stringified JSON locale values
                                let cleanLabel = item.label;
                                if (typeof cleanLabel === 'string' && cleanLabel.startsWith('{')) {
                                    try {
                                        const parsed = JSON.parse(cleanLabel);
                                        cleanLabel = parsed.en || Object.values(parsed)[0];
                                    } catch (_) {}
                                }
                                
                                return {
                                    id: item.id,
                                    label: cleanLabel,
                                    icon: item.image_url || item.icon_key,
                                    route: item.route,
                                    enabled: item.visible !== false
                                };
                            });

                            return {
                                id: sec.id,
                                title: sec.title || sec.id,
                                type: sec.type,
                                enabled: sec.visible !== false,
                                sort_order: sec.sort_order,
                                services
                            };
                        });

                        return {
                            version: backendConfig.version || '1.0.0',
                            banners: [],
                            sections,
                            trust_badges: [],
                            sos_banner: {} as any
                        };
                    }
                } catch (error) {
                    console.error("Failed to load backend dynamic home config:", error);
                }
                return null;
            },
            staleTime: 5000, // Make configurations refresh within 5 seconds of dashboard changes
            gcTime: 10000,
        });
    };

    return {
        useHomeConfig
    };
};
