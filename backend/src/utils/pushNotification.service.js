// ──────────────────────────────────────────────
//  FCM Push Notification Service
//  Sends push notifications via Firebase Cloud Messaging
// ──────────────────────────────────────────────

const { messaging } = require('../config/firebase');
const { logger } = require('../config/logger');
const prisma = require('../config/database');

/**
 * Send push notification to a single user by userId
 */
const sendPushToUser = async (userId, { title, body, data = {} }) => {
    try {
        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: { fcmDeviceToken: true, pushEnabled: true, status: true },
        });

        if (!user?.fcmDeviceToken || user.pushEnabled === false || user.status !== 'ACTIVE') {
            const reason = !user
                ? 'Recipient user not found'
                : user.status !== 'ACTIVE'
                    ? `Recipient user is ${user.status.toLowerCase()}`
                    : !user.fcmDeviceToken ? 'No FCM token' : 'User disabled push';
            logger.info(`[Push] Skipped for user ${userId}: ${reason}`);
            
            await prisma.notificationLog.create({
                data: {
                    channel: 'PUSH',
                    recipientId: userId,
                    recipientType: 'user',
                    subject: title,
                    body,
                    isSent: false,
                    errorMessage: reason,
                },
            });
            return false;
        }

        const message = {
            token: user.fcmDeviceToken,
            notification: { title, body },
            data: Object.fromEntries(
                Object.entries(data).map(([k, v]) => [k, String(v)])
            ),
            android: {
                priority: 'high',
                notification: { channelId: 'ayuxacare-default', sound: 'default' },
            },
            apns: {
                payload: { aps: { sound: 'default', badge: 1 } },
            },
        };

        const response = await messaging.send(message);
        logger.info(`[Push] ✅ Sent to user ${userId} [msgId: ${response}]`);

        // Log notification
        await prisma.notificationLog.create({
            data: {
                channel: 'PUSH',
                recipientId: userId,
                recipientType: 'user',
                subject: title,
                body,
                isSent: true,
                sentAt: new Date(),
            },
        });

        return true;
    } catch (error) {
        // Handle invalid/expired FCM tokens
        if (error.code === 'messaging/registration-token-not-registered' ||
            error.code === 'messaging/invalid-registration-token') {
            logger.warn(`Stale FCM token for user ${userId} — clearing`);
            await prisma.user.update({
                where: { id: userId },
                data: { fcmDeviceToken: null },
            });
        } else {
            logger.error(`[Push] ❌ Error for user ${userId}: ${error.message}`);
        }

        await prisma.notificationLog.create({
            data: {
                channel: 'PUSH',
                recipientId: userId,
                recipientType: 'user',
                subject: title,
                body,
                isSent: false,
                errorMessage: error.message,
            },
        });

        return false;
    }
};

/**
 * Send push notification directly to a device token
 */
const sendPushToToken = async (token, { title, body, data = {} }) => {
    try {
        const message = {
            token,
            notification: { title, body },
            data: Object.fromEntries(
                Object.entries(data).map(([k, v]) => [k, String(v)])
            ),
            android: { priority: 'high' },
        };

        const response = await messaging.send(message);
        logger.info(`[Push] ✅ Token push sent [msgId: ${response}]`);
        return true;
    } catch (error) {
        logger.error(`[Push] ❌ Token push failed: ${error.message}`);
        return false;
    }
};

/**
 * Send push to multiple users
 */
const sendPushToUsers = async (userIds, { title, body, data = {} }) => {
    const results = await Promise.allSettled(
        userIds.map((id) => sendPushToUser(id, { title, body, data }))
    );
    const sent = results.filter((r) => r.status === 'fulfilled' && r.value).length;
    logger.info(`[Push] Batch: ${sent}/${userIds.length} delivered`);
    return sent;
};

module.exports = { sendPushToUser, sendPushToToken, sendPushToUsers };
