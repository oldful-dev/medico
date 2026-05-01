/**
 * Get and display current FCM token
 */
export const getFCMToken = async () => {
    try {
        const { getToken } = await import("firebase/messaging");
        const { messaging } = await import("./firebaseConfig");

        if (!messaging) {
            console.error("Firebase Messaging not initialized");
            return null;
        }

        const vapidKey = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY;
        if (!vapidKey) {
            console.error("VAPID key not configured");
            return null;
        }

        const token = await getToken(messaging, { vapidKey });

        if (token) {
            console.log("\n" + "=".repeat(60));
            console.log("📱 Your FCM Token:");
            console.log("=".repeat(60));
            console.log(token);
            console.log("=".repeat(60));
            console.log("✅ Copy this token and paste in Firebase Console.\n");

            // Try to copy to clipboard (may fail if document not focused)
            try {
                await navigator.clipboard.writeText(token);
                console.log("✅ Copied to clipboard!");
            } catch (err) {
                console.warn("⚠️  Could not copy to clipboard (copy manually from above)");
            }
            return token;
        } else {
            console.error("Could not get FCM token");
            return null;
        }
    } catch (error) {
        console.error("Error getting FCM token:", error);
        return null;
    }
};

// Auto-register in window
if (typeof window !== "undefined") {
    (window as unknown as { getFCMToken: typeof getFCMToken }).getFCMToken = getFCMToken;
}
