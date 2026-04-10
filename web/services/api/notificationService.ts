import { apiClient, ApiResponse } from './apiClient';

export interface Notification {
    id: string;
    title: string;
    body: string;
    type?: string;
    isRead: boolean;
    createdAt: string;
}

export const notificationService = {
    // GET /notifications/my — Get current user's notifications
    getNotifications: (): Promise<ApiResponse<Notification[]>> =>
        apiClient.get<Notification[]>('/notifications/my'),

    // PUT /notifications/my/:id/read — Mark a specific notification as read
    markAsRead: (id: string): Promise<ApiResponse<null>> =>
        apiClient.put<null>(`/notifications/my/${id}/read`, {}),

    // PUT /notifications/my/read-all — Mark all notifications as read
    markAllAsRead: (): Promise<ApiResponse<null>> =>
        apiClient.put<null>('/notifications/my/read-all', {}),

    // Note: Backend currently doesn't expose a delete endpoint for users.
    // If needed in the future, it would likely be DELETE /notifications/my/:id
};
