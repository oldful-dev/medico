/**
 * Comprehensive Push Notification Diagnostic Script
 * Run in browser console: await diagnosePushNotifications()
 */

export const diagnosePushNotifications = async () => {
    console.log('\n' + '='.repeat(60));
    console.log('🔍 PUSH NOTIFICATION DIAGNOSTIC');
    console.log('='.repeat(60) + '\n');

    const results = {
        checks: [] as { name: string; passed: boolean; details: string }[],
        passed: 0,
        failed: 0,
    };

    const addCheck = (name: string, passed: boolean, details: string) => {
        results.checks.push({ name, passed, details });
        if (passed) {
            console.log(`✅ ${name}`);
            results.passed++;
        } else {
            console.log(`❌ ${name}`);
            results.failed++;
        }
        console.log(`   └─ ${details}\n`);
    };

    // 1. Check Service Worker Support
    const swSupported = 'serviceWorker' in navigator;
    addCheck('Service Worker Support', swSupported, swSupported ? 'Supported' : 'NOT supported in this browser');

    // 2. Check Service Worker Registration
    let swRegistration;
    try {
        swRegistration = await navigator.serviceWorker.getRegistration();
        const registered = !!swRegistration;
        addCheck('Service Worker Registered', registered, registered ? `Scope: ${swRegistration?.scope}` : 'No registration found');
    } catch (error) {
        addCheck('Service Worker Registered', false, `Error: ${error}`);
    }

    // 3. Check Service Worker Active
    if (swRegistration) {
        const hasActive = !!swRegistration.active;
        addCheck('Service Worker Active', hasActive, hasActive ? 'Active worker is running' : 'No active worker');
    }

    // 4. Check Notification Permission
    const notifPermission = Notification.permission;
    const permissionGranted = notifPermission === 'granted';
    addCheck('Notification Permission', permissionGranted, `Current: ${notifPermission}`);

    // 5. Check Notification Support
    const notifSupported = 'Notification' in window;
    addCheck('Notification API', notifSupported, notifSupported ? 'Supported' : 'NOT supported');

    // 6. Check Firebase Messaging
    try {
        const { messaging } = await import('./firebaseConfig');
        const hasMessaging = !!messaging;
        addCheck('Firebase Messaging Initialized', hasMessaging, hasMessaging ? 'Available' : 'NOT initialized');
    } catch (error) {
        addCheck('Firebase Messaging Initialized', false, `Error: ${error}`);
    }

    // 7. Check FCM Token
    try {
        const { getToken } = await import('firebase/messaging');
        const { messaging } = await import('./firebaseConfig');

        if (messaging) {
            const vapidKey = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY;
            if (vapidKey) {
                const token = await getToken(messaging, { vapidKey });
                const hasToken = !!token;
                addCheck('FCM Token Available', hasToken, hasToken ? `Token: ${token.substring(0, 40)}...` : 'No token');
            } else {
                addCheck('VAPID Key', false, 'VAPID key not configured in .env');
            }
        }
    } catch (error) {
        addCheck('FCM Token Available', false, `Error: ${error}`);
    }

    // 8. Check Service Worker Controller
    const hasController = !!navigator.serviceWorker.controller;
    addCheck('Service Worker Controller', hasController, hasController ? 'Controller is active' : 'No controller (page may need reload)');

    // 9. Check IndexedDB for Firebase
    try {
        const dbRequest = indexedDB.open('firebase');
        await new Promise((resolve) => {
            dbRequest.onsuccess = () => {
                const db = dbRequest.result;
                const stores = Array.from(db.objectStoreNames);
                const hasFirebaseDB = stores.length > 0;
                addCheck('Firebase IndexedDB', hasFirebaseDB, `Stores: ${stores.join(', ') || 'none'}`);
                resolve(null);
            };
            dbRequest.onerror = () => {
                addCheck('Firebase IndexedDB', false, 'Could not access IndexedDB');
                resolve(null);
            };
        });
    } catch (error) {
        addCheck('Firebase IndexedDB', false, `Error: ${error}`);
    }

    // 10. Check API Connectivity
    try {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';
        const response = await fetch(`${apiUrl}/users/profile`, {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('access_token') || ''}`,
            },
        });
        const ok = response.ok || response.status === 401;
        addCheck('API Connectivity', ok, `Status: ${response.status}`);
    } catch (error) {
        addCheck('API Connectivity', false, `Error: ${error}`);
    }

    // Summary
    console.log('='.repeat(60));
    console.log(`📊 SUMMARY: ${results.passed} passed, ${results.failed} failed`);
    console.log('='.repeat(60));

    if (results.failed === 0) {
        console.log('✅ All checks passed! Push notifications should work.');
        console.log('\n📝 Next steps:');
        console.log('1. Send a test campaign from Admin > Notifications');
        console.log('2. Check browser notification permissions');
        console.log('3. Look for notification in system tray or notification bell\n');
    } else {
        console.log('❌ Some checks failed. Fix issues above before testing.\n');
    }

    return results;
};

// Auto-register in window
if (typeof window !== 'undefined') {
    (window as unknown as { diagnosePushNotifications: typeof diagnosePushNotifications }).diagnosePushNotifications = diagnosePushNotifications;
    console.log('📝 Diagnostic script loaded! Run: await diagnosePushNotifications()');
}
