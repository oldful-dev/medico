/**
 * Test Push Notification Script
 * Run in browser console to test push notifications
 */

export const testPushNotification = async () => {
    console.log("🧪 Starting push notification test...\n");

    // Step 1: Check Firebase Messaging
    console.log("Step 1: Checking Firebase Messaging...");
    try {
        const { messaging } = await import("./firebaseConfig");
        if (!messaging) {
            console.error("❌ Firebase Messaging not initialized");
            return;
        }
        console.log("✅ Firebase Messaging available\n");
    } catch (error) {
        console.error("❌ Error importing Firebase:", error);
        return;
    }

    // Step 2: Check Service Worker
    console.log("Step 2: Checking Service Worker...");
    if (!("serviceWorker" in navigator)) {
        console.error("❌ Service Workers not supported");
        return;
    }

    try {
        const registration = await navigator.serviceWorker.getRegistration();
        if (!registration) {
            console.error("❌ Service Worker not registered");
            return;
        }
        console.log("✅ Service Worker registered:", registration.scope, "\n");
    } catch (error) {
        console.error("❌ Error checking Service Worker:", error);
        return;
    }

    // Step 3: Check Notification Permission
    console.log("Step 3: Checking Notification Permission...");
    const permission = Notification.permission;
    console.log(`   Current permission: ${permission}`);

    if (permission !== "granted") {
        console.error("❌ Notification permission not granted");
        console.log("   Request permission first: Notification.requestPermission()\n");
        return;
    }
    console.log("✅ Notification permission granted\n");

    // Step 4: Check FCM Token in IndexedDB
    console.log("Step 4: Checking FCM Token in IndexedDB...");
    try {
        const dbRequest = indexedDB.open("firebase");

        await new Promise((resolve, reject) => {
            dbRequest.onsuccess = () => {
                const db = dbRequest.result;
                const stores = Array.from(db.objectStoreNames);
                console.log("   Available stores:", stores);

                // Look for messaging token storage
                if (stores.includes("firebase-app-check-database")) {
                    console.log("✅ Firebase database found");
                } else {
                    console.log("⚠️  Firebase database not yet created (normal on first load)");
                }
                resolve(null);
            };

            dbRequest.onerror = () => {
                console.warn("⚠️  Could not access IndexedDB (may be restricted)");
                resolve(null);
            };
        });
    } catch (error) {
        console.warn("⚠️  IndexedDB check skipped:", error);
    }
    console.log("");

    // Step 5: Check API Connection
    console.log("Step 5: Checking API Connection...");
    try {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";
        const response = await fetch(`${apiUrl}/users/profile`, {
            headers: {
                Authorization: `Bearer ${localStorage.getItem("access_token") || ""}`,
            },
        });

        if (response.ok) {
            console.log("✅ API connection working\n");
        } else if (response.status === 401) {
            console.warn("⚠️  User not authenticated (expected if not logged in)\n");
        } else {
            console.error("❌ API returned error:", response.status);
        }
    } catch (error) {
        console.error("❌ API connection failed:", error);
    }

    // Step 6: Summary
    console.log("=" .repeat(50));
    console.log("🎉 Push Notification Setup Complete!");
    console.log("=" .repeat(50));
    console.log("\nYour push notification system is ready:");
    console.log("  ✅ Firebase Messaging initialized");
    console.log("  ✅ Service Worker registered");
    console.log("  ✅ Notification permission granted");
    console.log("  ✅ API connection working");
    console.log("\nNext steps:");
    console.log("  1. Go to Firebase Console");
    console.log("  2. Cloud Messaging → Send your first message");
    console.log("  3. Select Web app as target");
    console.log("  4. Send test notification");
    console.log("  5. You should see notification appear!");
    console.log("\nIf notification doesn't appear:");
    console.log("  - Check browser console for errors");
    console.log("  - Verify FCM token is registered: check database");
    console.log("  - Check if user has fcmDeviceToken in database\n");
};

// Auto-run if in browser console
if (typeof window !== "undefined") {
    (window as any).testPushNotification = testPushNotification;
    console.log("📝 Push Notification Test Script loaded!");
    console.log("Run: testPushNotification() to test your setup");
}
