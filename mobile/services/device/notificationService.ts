// ──────────────────────────────────────────────
//  Notification Service — Push notifications
//  Uses expo-notifications for device registration
//  Uses expo-device for device type detection
// ──────────────────────────────────────────────

import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import { storageService, STORAGE_KEYS } from './storageService';
import { apiClient } from '../api/apiClient';

export interface PushNotification {
    id: string;
    title: string;
    body: string;
    data?: Record<string, any>;
    timestamp: Date;
    read: boolean;
}

// Notification types that warrant an alert banner + sound.
// Everything else arrives silently (badge + inbox only).
const ALERT_TYPES = new Set([
    'booking_created',
    'lab_booking_confirmed',
    'subscription_activated',
    'caregiver_assigned',
    'booking_status',
    'lab_rescheduled',
    'ticket_created',
    'ticket_reply',
    'sos_confirmation',
    'sos_responder_assigned',
    'sos_resolved',
]);

Notifications.setNotificationHandler({
    handleNotification: async (notification) => {
        const type = notification.request.content.data?.type as string | undefined;
        const isImportant = !!type && ALERT_TYPES.has(type);
        return {
            shouldShowAlert: isImportant,
            shouldPlaySound: isImportant,
            shouldSetBadge: true,
            shouldShowBanner: isImportant,
            shouldShowList: true,
        };
    },
});

import { cleanNotificationText } from '../../utils/sanitizeText';

function cleanText(text: string | null | undefined): string {
    return cleanNotificationText(text);
}

export const notificationService = {
    /**
     * Request push notification permission
     */
    requestPermission: async (): Promise<boolean> => {
        if (!Device.isDevice) {
            console.warn('Push notifications are not available on simulator');
            return false;
        }

        const { status: existingStatus } = await Notifications.getPermissionsAsync();
        let finalStatus = existingStatus;

        if (existingStatus !== 'granted') {
            const { status } = await Notifications.requestPermissionsAsync();
            finalStatus = status;
        }

        return finalStatus === 'granted';
    },

    /**
     * Register device for push notifications
     * Returns the native FCM token (required by Firebase Admin SDK on backend)
     */
    registerForPush: async (): Promise<string | null> => {
        const hasPermission = await notificationService.requestPermission();
        if (!hasPermission) return null;

        try {
            if (Platform.OS === 'android') {
                await Notifications.setNotificationChannelAsync('ayuxacare-default', {
                    name: 'Ayuxa Notifications',
                    importance: Notifications.AndroidImportance.HIGH,
                    vibrationPattern: [0, 250, 250, 250],
                    lightColor: '#048357',
                    sound: 'default',
                });
            }

            const tokenData = await Notifications.getDevicePushTokenAsync();
            const token = tokenData.data as string;

            await storageService.setItem(STORAGE_KEYS.PUSH_TOKEN, token);
            return token;
        } catch (error) {
            console.error('Failed to get push token:', error);
            return null;
        }
    },

    /**
     * Schedule a local notification
     */
    scheduleLocalNotification: async (
        title: string,
        body: string,
        triggerSeconds: number = 1
    ): Promise<void> => {
        await Notifications.scheduleNotificationAsync({
            content: { title: cleanText(title), body: cleanText(body), sound: 'default' },
            trigger: { seconds: triggerSeconds, type: 'timeInterval' } as any,
        });
    },

    /**
     * Add a listener for incoming notifications
     */
    addNotificationListener: (
        callback: (notification: Notifications.Notification) => void
    ): Notifications.Subscription => {
        return Notifications.addNotificationReceivedListener(callback);
    },

    /**
     * Add a listener for notification responses (taps)
     */
    addResponseListener: (
        callback: (response: Notifications.NotificationResponse) => void
    ): Notifications.Subscription => {
        return Notifications.addNotificationResponseReceivedListener(callback);
    },

    /**
     * Get notification history from backend
     */
    getNotifications: async (): Promise<PushNotification[]> => {
        try {
            const res = await apiClient.get<any>('/notifications/my?limit=50');
            if (res.success && res.data) {
                const rawList = Array.isArray(res.data) ? res.data : [];
                return rawList.map((raw: any) => ({
                    id: raw.id,
                    title: cleanText(raw.subject ?? raw.templateId ?? 'Notification'),
                    body: cleanText(raw.body ?? ''),
                    read: raw.isRead,
                    timestamp: new Date(raw.createdAt),
                }));
            }
            return [];
        } catch (e) {
            console.error('getNotifications error:', e);
            return [];
        }
    },

    /**
     * Mark a notification as read
     */
    markAsRead: async (id: string): Promise<boolean> => {
        try {
            const res = await apiClient.put(`/notifications/my/${id}/read`);
            return res.success;
        } catch (e) {
            console.error('markAsRead error:', e);
            return false;
        }
    },
};
