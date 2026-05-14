// ──────────────────────────────────────────────
//  Notification Service — Push notifications
//  Uses expo-notifications for device registration
//  Uses expo-device for device type detection
// ──────────────────────────────────────────────

import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import { storageService, STORAGE_KEYS } from './storageService';

export interface PushNotification {
    id: string;
    title: string;
    body: string;
    data?: Record<string, any>;
    timestamp: Date;
    read: boolean;
}

// Configure notification display behavior
Notifications.setNotificationHandler({
    handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
    }),
});

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
            // Set up Android notification channel first
            if (Platform.OS === 'android') {
                await Notifications.setNotificationChannelAsync('ayuxacare-default', {
                    name: 'Ayuxa Notifications',
                    importance: Notifications.AndroidImportance.HIGH,
                    vibrationPattern: [0, 250, 250, 250],
                    lightColor: '#048357',
                    sound: 'default',
                });
            }

            // Use native device token (FCM on Android, APNs on iOS)
            // This is what Firebase Admin SDK expects — NOT the Expo push token
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
            content: { title, body, sound: 'default' },
            trigger: { seconds: triggerSeconds },
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
};
