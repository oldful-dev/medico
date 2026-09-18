// ──────────────────────────────────────────────
//  Delhivery Low-Balance Alert
//
//  Delhivery has no public wallet-balance API on this account, so the
//  balance itself can't be polled. Instead, this detects the specific
//  "insufficient balance" failure Delhivery returns when a prepaid
//  shipment's manifest charge can't be deducted, and raises an alert
//  from that symptom — admin panel banner (via UIConfig, read by the
//  frontend), a real-time toast to anyone logged into the panel right
//  now (emitToAdmins), and one throttled email so it's seen even if no
//  one's looking at the panel.
// ──────────────────────────────────────────────

const prisma = require('../config/database');
const { logger } = require('../config/logger');
const { emitToAdmins } = require('../services/socket.service');

const ALERT_CONFIG_KEY = 'DELHIVERY_BALANCE_ALERT';
const EMAIL_THROTTLE_MS = 6 * 60 * 60 * 1000; // at most one email every 6 hours

const isInsufficientBalanceError = (message) =>
    /insufficient balance/i.test(String(message || ''));

/**
 * Call from attemptFulfillment's catch block with the raw error message.
 * Non-fatal — never throws, so a failure here can't affect the fulfillment
 * result it's reporting on.
 */
async function reportFulfillmentError(errorMessage, orderCode) {
    if (!isInsufficientBalanceError(errorMessage)) return;

    try {
        const existing = await prisma.uIConfig.findUnique({ where: { key: ALERT_CONFIG_KEY } });
        const now = new Date();
        const state = existing?.configJson || {};
        const lastEmailSentAt = state.lastEmailSentAt ? new Date(state.lastEmailSentAt) : null;
        const shouldEmail = !lastEmailSentAt || (now - lastEmailSentAt) > EMAIL_THROTTLE_MS;

        await prisma.uIConfig.upsert({
            where: { key: ALERT_CONFIG_KEY },
            update: {
                configJson: {
                    isLowBalance: true,
                    lastErrorAt: now.toISOString(),
                    lastOrderCode: orderCode,
                    lastEmailSentAt: shouldEmail ? now.toISOString() : state.lastEmailSentAt || null,
                },
            },
            create: {
                key: ALERT_CONFIG_KEY,
                label: 'Delhivery Low Balance Alert',
                configJson: {
                    isLowBalance: true,
                    lastErrorAt: now.toISOString(),
                    lastOrderCode: orderCode,
                    lastEmailSentAt: shouldEmail ? now.toISOString() : null,
                },
            },
        });

        emitToAdmins('delhivery_low_balance', {
            orderCode,
            message: 'Delhivery wallet balance is too low — new orders cannot be shipped until it is recharged.',
        });

        if (shouldEmail) {
            try {
                const { getNotificationRecipients } = require('../services/companyConfig.service');
                const recipients = await getNotificationRecipients();
                const to = recipients?.booking?.email;
                if (to) {
                    const { sendEmail } = require('../services/email');
                    await sendEmail({
                        to,
                        subject: 'Action needed: Delhivery wallet balance is too low',
                        html: `
                            <p>Order <strong>${orderCode}</strong> could not be shipped because the Delhivery wallet balance is too low.</p>
                            <p>New orders will keep failing to ship until the wallet is recharged. Please top it up from the Delhivery dashboard.</p>
                        `,
                    });
                }
            } catch (emailErr) {
                logger.warn('[DelhiveryBalanceAlert] Failed to send low-balance email (non-fatal):', emailErr.message);
            }
        }
    } catch (err) {
        logger.warn('[DelhiveryBalanceAlert] Failed to record low-balance alert (non-fatal):', err.message);
    }
}

/**
 * Call after a successful fulfillment to clear the flag — the wallet clearly
 * has funds again, so the banner shouldn't keep showing stale state.
 */
async function clearAlert() {
    try {
        const existing = await prisma.uIConfig.findUnique({ where: { key: ALERT_CONFIG_KEY } });
        if (!existing?.configJson?.isLowBalance) return;
        await prisma.uIConfig.update({
            where: { key: ALERT_CONFIG_KEY },
            data: { configJson: { ...existing.configJson, isLowBalance: false } },
        });
        emitToAdmins('delhivery_low_balance_cleared', {});
    } catch (err) {
        logger.warn('[DelhiveryBalanceAlert] Failed to clear low-balance alert (non-fatal):', err.message);
    }
}

module.exports = { ALERT_CONFIG_KEY, isInsufficientBalanceError, reportFulfillmentError, clearAlert };
