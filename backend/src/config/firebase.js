// ──────────────────────────────────────────────
//  Firebase Admin Configuration
// ──────────────────────────────────────────────

const admin = require('firebase-admin');
const { logger } = require('./logger');
const path = require('path');

const serviceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH || './firebase-service-account.json';

try {
    const serviceAccount = require(path.resolve(serviceAccountPath));
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        storageBucket: process.env.GOOGLE_STORAGE_BUCKET_NAME || 'oldful-assets.appspot.com',
    });
    logger.info('🔥 Firebase Admin initialized successfully');
} catch (error) {
    logger.error('❌ Firebase Admin initialization error:', error.message);
    logger.warn('Firebase functionality will be limited or simulated.');
}

const auth = admin.auth();
const messaging = admin.messaging();
const remoteConfig = admin.remoteConfig();

module.exports = {
    admin,
    auth,
    messaging,
    remoteConfig,
};
