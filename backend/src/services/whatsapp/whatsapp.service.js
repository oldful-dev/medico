// ──────────────────────────────────────────────
//  WhatsApp Service
//
//  Central sendWhatsApp() with:
//    - template registry lookup
//    - full validation
//    - WABA routing (AYUXA / AYUXA_FAMILY / AYUXA_RELEASE / AYUXA_HQ / AYUXA_ALERT)
//    - 30-second idempotency for OTP templates
//    - in-memory rate limiting (per mobile, per template)
//    - NotificationLog persistence (Prisma)
//    - user preference check (whatsappEnabled)
// ──────────────────────────────────────────────

const { dispatch } = require('./fast2sms.provider');
const { validateSendPayload, WhatsAppValidationError } = require('./validators');
const { logger } = require('../../config/logger');
const prisma = require('../../config/database');
const { canSendTo } = require('../../utils/communicationGate');

// ── Idempotency / Rate-limit store ────────────────────────────────────────────
// key → { lastSentAt: timestamp, count: number }
const _sendCache = new Map();
const IDEMPOTENCY_TTL_MS = 30 * 1000;      // OTP dedup window
const RATE_LIMIT_WINDOW_MS = 60 * 1000;    // 1-minute window
const RATE_LIMIT_MAX = 5;                  // max sends per mobile per template per minute
const OTP_TEMPLATES = new Set(['OTP_USER', 'FAMILY_OTP', 'EMP_OTP']);

const _cacheKey = (template, mobile) => `${template}:${mobile}`;

const _checkRateAndIdempotency = (template, mobile) => {
    const key = _cacheKey(template, mobile);
    const now = Date.now();
    const entry = _sendCache.get(key);

    if (entry) {
        // Idempotency: block OTP resends within 30s
        if (OTP_TEMPLATES.has(template) && now - entry.lastSentAt < IDEMPOTENCY_TTL_MS) {
            const remaining = Math.ceil((IDEMPOTENCY_TTL_MS - (now - entry.lastSentAt)) / 1000);
            return { blocked: true, reason: `duplicate_otp`, retryAfter: remaining };
        }

        // Rate limit: block if too many sends in the rolling window
        if (now - entry.windowStart < RATE_LIMIT_WINDOW_MS && entry.count >= RATE_LIMIT_MAX) {
            const remaining = Math.ceil((RATE_LIMIT_WINDOW_MS - (now - entry.windowStart)) / 1000);
            return { blocked: true, reason: 'rate_limited', retryAfter: remaining };
        }

        // Reset window if expired
        if (now - entry.windowStart >= RATE_LIMIT_WINDOW_MS) {
            entry.windowStart = now;
            entry.count = 0;
        }

        entry.lastSentAt = now;
        entry.count += 1;
    } else {
        _sendCache.set(key, { lastSentAt: now, windowStart: now, count: 1 });
    }

    // Prune stale entries every ~1000 inserts
    if (_sendCache.size % 1000 === 0) {
        for (const [k, v] of _sendCache) {
            if (now - v.lastSentAt > RATE_LIMIT_WINDOW_MS * 2) _sendCache.delete(k);
        }
    }

    return { blocked: false };
};

// ── User preference check ──────────────────────────────────────────────────────

const _isWhatsAppEnabled = async (userId) => {
    if (!userId) return true;
    try {
        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: { whatsappEnabled: true },
        });
        return user?.whatsappEnabled !== false;
    } catch {
        return true; // fail open — don't block notifications on DB error
    }
};

// ── Persist NotificationLog ────────────────────────────────────────────────────

const _log = async ({ userId, template, mobile, variables, waba, success, requestId, error }) => {
    try {
        await prisma.notificationLog.create({
            data: {
                channel: 'WHATSAPP',
                recipientId: userId || null,
                recipientType: userId ? 'user' : 'anonymous',
                body: `[${template}] waba:${waba} vars:${JSON.stringify(variables)}`,
                isSent: success,
                sentAt: success ? new Date() : null,
                errorMessage: success ? null : (error || 'Unknown error'),
            },
        });
    } catch (logErr) {
        logger.warn('[WA Service] NotificationLog write failed:', logErr.message);
    }
};

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Send a WhatsApp template message.
 *
 * @param {object}   opts
 * @param {string}   opts.template      - Key from WHATSAPP_TEMPLATES (e.g. 'BOOKING_CONFIRMED')
 * @param {string}   opts.mobile        - Recipient phone number (any Indian format)
 * @param {string[]} opts.variables     - Ordered variable values
 * @param {string}  [opts.userId]       - Internal user ID (for preference check + log)
 * @param {string}  [opts.mediaUrl]     - Optional media URL for media-header templates
 * @param {string}  [opts.docFilename]  - Optional document filename
 * @returns {Promise<boolean>}          - true if sent (or queued), false on failure/block
 */
const sendWhatsApp = async ({ template, mobile, variables = [], userId = null, mediaUrl, docFilename }) => {
    // ── 1. Validate all inputs ─────────────────────────────────────────
    let cleanMobile, tmpl, wabaConfig;
    try {
        ({ cleanMobile, tmpl, wabaConfig } = validateSendPayload({ template, mobile, variables, mediaUrl, docFilename }));
    } catch (err) {
        if (err instanceof WhatsAppValidationError) {
            logger.error(`[WA Service] Validation error: ${err.message}`);
            return false;
        }
        throw err;
    }

    // ── 2. Recipient eligibility (deleted/blocked user) ──────────────────
    const gate = await canSendTo(userId);
    if (!gate.allowed) {
        logger.info(`[WA Service] Blocked (${gate.reason}) — skipping ${template} to user ${userId}`);
        await _log({ userId, template, mobile: cleanMobile, variables, waba: wabaConfig?.name, success: false, error: gate.reason });
        return false;
    }

    // ── 3. User preference check ───────────────────────────────────────
    const enabled = await _isWhatsAppEnabled(userId);
    if (!enabled) {
        logger.info(`[WA Service] User ${userId} has WhatsApp disabled — skipping ${template}`);
        return false;
    }

    // ── 4. Idempotency / rate-limit ────────────────────────────────────
    const guard = _checkRateAndIdempotency(template, cleanMobile);
    if (guard.blocked) {
        logger.warn(`[WA Service] Blocked (${guard.reason}) — ${template} → +91${cleanMobile} (retry in ${guard.retryAfter}s)`);
        return false;
    }

    // ── 4. Dispatch via provider ───────────────────────────────────────
    const result = await dispatch({
        mobile: cleanMobile,
        messageId: tmpl.messageId,
        phoneNumberId: wabaConfig.phoneNumberId,
        variables,
        mediaUrl,
        docFilename,
    });

    // ── 5. Log result ──────────────────────────────────────────────────
    await _log({
        userId,
        template,
        mobile: cleanMobile,
        variables,
        waba: tmpl.waba,
        success: result.success,
        requestId: result.requestId,
        error: result.error,
    });

    if (result.success) {
        logger.info(`[WA Service] ✅ ${template} → +91${cleanMobile} via ${tmpl.waba} [reqId: ${result.requestId || 'n/a'}]`);
        console.log(
            `[WA ✅] ${template}` +
            ` | waba: ${tmpl.waba}` +
            ` | msgId: ${tmpl.messageId}` +
            ` | to: +91${cleanMobile}` +
            ` | vars: [${variables.map(v => String(v).substring(0, 40)).join(', ')}]` +
            ` | reqId: ${result.requestId || 'n/a'}`
        );
    } else {
        logger.error(`[WA Service] ❌ ${template} → +91${cleanMobile}: ${result.error}`);
        console.log(`[WA ❌] ${template} | waba: ${tmpl.waba} | to: +91${cleanMobile} | error: ${result.error}`);
    }

    return result.success;
};

module.exports = { sendWhatsApp };
