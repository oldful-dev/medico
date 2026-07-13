import { apiClient, ApiResponse } from './apiClient';

export interface UIConfig {
  id: string;
  key: string;
  label: string;
  type: string;
  configJson: any;
  isVisible: boolean;
}

export const uiConfigService = {
  getPublishedConfigs: async (): Promise<ApiResponse<UIConfig[]>> => {
    return apiClient.get<UIConfig[]>('/ui-config/published');
  },
  
  getCompanyGlobalConfig: async (): Promise<any> => {
    const res = await apiClient.get<UIConfig[]>('/ui-config/published');
    if (res.success && Array.isArray(res.data)) {
      const found = res.data.find(c => c.key === 'company_global_config');
      if (found) {
        let parsed = found.configJson;
        if (typeof parsed === 'string') {
          try {
            parsed = JSON.parse(parsed);
          } catch (_) {}
        }
        return parsed;
      }
    }
    return null;
  }
};
