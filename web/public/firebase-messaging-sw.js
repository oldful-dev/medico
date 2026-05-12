// Firebase Messaging Service Worker - Compat SDK
importScripts('https://www.gstatic.com/firebasejs/10.5.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.5.0/firebase-messaging-compat.js');

let firebaseApp;
let messaging;
let handlerRegistered = false;

console.log('[SW] Service Worker loaded');

self.addEventListener('install', (event) => {
    console.log('[SW] Install event');
    self.skipWaiting();
});

self.addEventListener('activate', (event) => {
    console.log('[SW] Activate event');
    event.waitUntil(self.clients.claim());
});

// Handle messages from main thread
self.addEventListener('message', (event) => {
    if (event.data?.type === 'INIT_FIREBASE') {
        console.log('[SW] Initializing Firebase');
        const config = event.data.firebaseConfig;

        try {
            if (!firebaseApp) {
                firebaseApp = firebase.initializeApp(config);
            }

            if (!messaging) {
                messaging = firebase.messaging(firebaseApp);
                console.log('[SW] Firebase messaging initialized');
            }

            // Register handler only once
            if (!handlerRegistered && messaging) {
                console.log('[SW] Setting up onBackgroundMessage handler');

                messaging.onBackgroundMessage((payload) => {
                    console.log('[SW] 🎉 MESSAGE RECEIVED:', JSON.stringify(payload, null, 2));

                    const title = payload.notification?.title || 'Ayuxa';
                    const options = {
                        body: payload.notification?.body || 'New notification',
                        icon: '/olfful-logo.png',
                        badge: '/olfful-logo.png',
                        tag: 'Ayuxa-push',
                        data: payload.data || {},
                    };

                    console.log('[SW] Displaying notification:', title, options);
                    return self.registration.showNotification(title, options);
                });

                handlerRegistered = true;
                console.log('[SW] Handler registered');
            }
        } catch (error) {
            console.error('[SW] Init error:', error.message);
        }
    }
});

// Handle clicks
self.addEventListener('notificationclick', (event) => {
    event.notification.close();
    event.waitUntil(
        clients.matchAll({ type: 'window' }).then((clients) => {
            for (let client of clients) {
                if (client.url.includes('/app/')) {
                    return client.focus();
                }
            }
            return clients.openWindow('/app/dashboard');
        })
    );
});
