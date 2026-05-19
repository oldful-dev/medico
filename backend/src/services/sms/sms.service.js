// ──────────────────────────────────────────────
//  SMS Service
//  Central sendSMS() with validation, idempotency, variable injection,
//  and NotificationLog persistence (Prisma).
// ──────────────────────────────────────────────

const { SMS_TEMPLATES } = require('./templates');
const { dispatchSMS } = require('./fast2sms.provider');
const { logger } = require('../../config/logger');
const prisma = require('../../config/database');

// In-memory idempotency store: key → timestamp
// Prevents duplicate sends within 30 seconds for OTP templates.
const _idempotencyCache = new Map();
const IDEMPOTENCY_TTL_MS = 30 * 1000;
const OTP_TEMPLATES = new Set(['OTP_USER', 'ADMIN_LOGIN_OTP']);

/**
 * Validate a 10-digit Indian mobile number.
 * Accepts: "9876543210", "+919876543210", "919876543210"
 */
const validateMobile = (mobile) => {
    const clean = String(mobile).replace(/\D/g, '').slice(-10);
    if (!/^[6-9]\d{9}$/.test(clean)) {
        throw new Error(`Invalid Indian mobile number: ${mobile}`);
    }
    return clean;
};

/**
 * Build pipe-separated variables string for Fast2SMS.
 * Fast2SMS expects: "val1|val2|" (trailing pipe required).
 */
const buildVariablesString = (variables) => {
    if (!variables || variables.length === 0) return '';
    return variables.map(String).join('|') + '|';
};

/**
 * Check and set idempotency key. Returns true if duplicate.
 */
const isDuplicate = (templateName, mobile) => {
    if (!OTP_TEMPLATES.has(templateName)) return false;

    const key = `${templateName}:${mobile}`;
    const now = Date.now();
    const last = _idempotencyCache.get(key);

    if (last && now - last < IDEMPOTENCY_TTL_MS) {
        const remaining = Math.ceil((IDEMPOTENCY_TTL_MS - (now - last)) / 1000);
        logger.warn(`[SMS] Duplicate suppressed — ${key} (retry in ${remaining}s)`);
        return true;
    }

    _idempotencyCache.set(key, now);

    // Prune expired entries to prevent unbounded memory growth
    if (_idempotencyCache.size > 5000) {
        for (const [k, ts] of _idempotencyCache) {
            if (now - ts > IDEMPOTENCY_TTL_MS) _idempotencyCache.delete(k);
        }
    }

    return false;
};

/**
 * Send a DLT SMS.
 *
 * @param {object} opts
 * @param {string}   opts.template   - Key from SMS_TEMPLATES (e.g. 'OTP_USER')
 * @param {string}   opts.mobile     - Recipient phone number
 * @param {string[]} opts.variables  - Ordered values replacing {#var#} placeholders
 * @param {string}  [opts.userId]    - Optional internal user ID for log association
 * @returns {Promise<boolean>}       - true on success
 */
const sendSMS = async ({ template, mobile, variables = [], userId = null }) => {
    // ── 1. Resolve template ────────────────────────────────────────────
    const tmpl = SMS_TEMPLATES[template];
    if (!tmpl) {
        throw new Error(`[SMS] Unknown template: "${template}". Available: ${Object.keys(SMS_TEMPLATES).join(', ')}`);
    }

    // ── 2. Validate variable count ─────────────────────────────────────
    if (variables.length !== tmpl.variables) {
        throw new Error(
            `[SMS] Template "${template}" expects ${tmpl.variables} variable(s), got ${variables.length}`
        );
    }

    // ── 3. Validate mobile ─────────────────────────────────────────────
    const cleanMobile = validateMobile(mobile);

    // ── 4. Idempotency check (OTP templates only) ──────────────────────
    if (isDuplicate(template, cleanMobile)) {
        return false;
    }

    // ── 5. Dispatch ────────────────────────────────────────────────────
    const variablesStr = buildVariablesString(variables);

    const result = await dispatchSMS({
        mobile: cleanMobile,
        senderId: tmpl.senderId,
        templateId: tmpl.templateId,
        variables: variablesStr,
    });

    // ── 6. Persist notification log ────────────────────────────────────
    try {
        await prisma.notificationLog.create({
            data: {
                channel: 'SMS',
                recipientId: userId,
                recipientType: userId ? 'user' : 'anonymous',
                body: `[${template}] vars: ${JSON.stringify(variables)}`,
                isSent: result.success,
                sentAt: result.success ? new Date() : null,
                errorMessage: result.success ? null : (result.error || 'Unknown error'),
            },
        });
    } catch (logErr) {
        logger.warn('[SMS] Failed to persist notification log:', logErr.message);
    }

    if (result.success) {
        logger.info(`[SMS] ✅ Sent ${template} → +91${cleanMobile} [reqId: ${result.requestId || 'n/a'}]`);
    } else {
        logger.error(`[SMS] ❌ Failed ${template} → +91${cleanMobile}: ${result.error}`);
    }

    return result.success;
};

module.exports = { sendSMS };
