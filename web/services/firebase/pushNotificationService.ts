import { onMessage, getToken } from "firebase/messaging";
import { messaging } from "./firebaseConfig";
import { apiClient } from "../api/apiClient";

let swRegistration: ServiceWorkerRegistration | null = null;

/**
 * Convert base64 VAPID key to Uint8Array
 */
const urlBase64ToUint8Array = (base64String: string) => {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding)
        .replace(/\-/g, '+')
        .replace(/_/g, '/');
    const rawData = window.atob(base64);
    return new Uint8Array([...rawData].map((char) => char.charCodeAt(0)));
};

/**
 * Register Service Worker for background message handling
 */
/**
 * Send Firebase config to the service worker
 */
const sendFirebaseConfigToSW = (registration: ServiceWorkerRegistration) => {
    const firebaseConfig = {
        apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
        authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
        projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
        storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
        messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
        appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
    };

    const messageData = { type: "INIT_FIREBASE", firebaseConfig };

    // Send to controller (globally active SW) with retry
    if (navigator.serviceWorker.controller) {
        navigator.serviceWorker.controller.postMessage(messageData);
        console.log("✅ Firebase config sent to controller");
    } else {
        console.warn("⚠️  No active controller yet");
    }

    // Also send to active worker
    if (registration.active) {
        registration.active.postMessage(messageData);
        console.log("✅ Firebase config sent to active worker");
    } else if (registration.waiting) {
        registration.waiting.postMessage(messageData);
        console.log("✅ Firebase config sent to waiting worker");
    } else if (registration.installing) {
        registration.installing.postMessage(messageData);
        console.log("✅ Firebase config sent to installing worker");
    }
};

export const registerServiceWorker = async () => {
    if (!("serviceWorker" in navigator)) {
        console.warn("Service Workers not supported");
        return false;
    }

    try {
        swRegistration = await navigator.serviceWorker.register("/firebase-messaging-sw.js", {
            scope: "/",
        });
        console.log("Service Worker registered successfully");

        // Send Firebase config immediately
        sendFirebaseConfigToSW(swRegistration);

        // Also listen for controller change
        navigator.serviceWorker.addEventListener('controllerchange', () => {
            console.log("Service Worker controller changed, sending config again");
            sendFirebaseConfigToSW(swRegistration!);
        });

        return true;
    } catch (error) {
        console.error("Service Worker registration failed:", error);
        return false;
    }
};

/**
 * Get FCM token and register with backend
 */
export const registerFCMToken = async () => {
    if (!messaging) {
        console.warn("Firebase Messaging not available");
        return false;
    }

    try {
        const vapidKey = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY;
        if (!vapidKey) {
            console.warn("VAPID key not configured");
            return false;
        }

        // First, ensure push subscription exists
        const swRegistration = await navigator.serviceWorker.getRegistration();
        if (!swRegistration) {
            console.error("Service Worker not registered");
            return false;
        }

        let subscription = await swRegistration.pushManager.getSubscription();
        if (!subscription) {
            console.log("Creating new push subscription...");
            try {
                subscription = await swRegistration.pushManager.subscribe({
                    userVisibleOnly: true,
                    applicationServerKey: urlBase64ToUint8Array(vapidKey),
                });
                console.log("✅ Push subscription created");
            } catch (error) {
                console.error("❌ Failed to create push subscription:", error);
                return false;
            }
        } else {
            console.log("✅ Push subscription already exists");
        }

        // Now get the FCM token
        const token = await getToken(messaging, { vapidKey });
        if (!token) {
            console.warn("Failed to get FCM token");
            return false;
        }

        console.log("✅ FCM Token obtained:", token.substring(0, 20) + "...");

        // Register token with backend
        try {
            await apiClient.put("/users/profile/device-token", { fcmToken: token });
            console.log("✅ FCM Token registered with backend");
            return true;
        } catch (error) {
            console.error("Failed to register FCM token with backend:", error);
            return false;
        }
    } catch (error) {
        console.error("Error getting FCM token:", error);
        return false;
    }
};

/**
 * Setup push notification listener for foreground messages
 * Listens for incoming FCM messages and refreshes notifications
 */
export const setupPushNotificationListener = (onNotification?: (notification: any) => void) => {
    if (!messaging) {
        console.warn("Firebase Messaging not supported on this browser");
        return;
    }

    onMessage(messaging, (payload) => {
        console.log("Push notification received (foreground):", payload);

        // Handle notification
        if (payload.notification) {
            const { title, body } = payload.notification;

            // Show browser notification
            if ("Notification" in window && Notification.permission === "granted") {
                new Notification(title || "Oldful", {
                    body: body || "You have a new notification",
                    icon: "/olfful-logo.png",
                    badge: "/olfful-logo.png",
                    tag: "oldful-notification",
                });
            }

            // Callback for custom handling
            if (onNotification) {
                onNotification(payload);
            }
        }
    });
};

/**
 * Request notification permission and register service worker + FCM token
 */
export const requestNotificationPermission = async () => {
    try {
        // Register service worker first
        const swRegistered = await registerServiceWorker();
        if (!swRegistered) {
            console.error("Service Worker registration failed");
            return false;
        }

        // Wait for SW to become fully active
        await new Promise(resolve => setTimeout(resolve, 500));

        // Request notification permission
        const permission = await Notification.requestPermission();
        if (permission === "granted") {
            console.log("✅ Notification permission granted");

            // Wait before registering FCM token to ensure SW is ready
            await new Promise(resolve => setTimeout(resolve, 300));

            // Register FCM token with backend
            const tokenRegistered = await registerFCMToken();
            if (tokenRegistered) {
                console.log("✅ Push notification setup complete");
                return true;
            } else {
                console.warn("⚠️  FCM token registration failed, but permission is granted");
                return true;
            }
        } else {
            console.log("❌ Notification permission denied");
            return false;
        }
    } catch (error) {
        console.error("Error requesting notification permission:", error);
        return false;
    }
};
