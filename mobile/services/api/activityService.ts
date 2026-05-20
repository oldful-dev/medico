import { apiClient, ApiResponse } from './apiClient';

export interface ActivityUpdate {
    id: string;
    labOrderId: string;
    clientRefId?: string;
    eventType: string;
    serviceType: string;
    staffName: string;
    staffId: string;
    staffPhone: string;
    staffPhotoUrl?: string;
    eta?: string;
    statusDetail?: string;
    createdAt: string;
}

export const activityService = {
    getMyUpdates: (): Promise<ApiResponse<ActivityUpdate[]>> =>
        apiClient.get<ActivityUpdate[]>('/activity/my-updates'),
};
