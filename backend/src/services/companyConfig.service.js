// ──────────────────────────────────────────────
//  Company Config Service
//  In-process cache for company_global_config from UIConfig table.
//
//  Usage:
//    const { getNotificationRecipients } = require('./companyConfig.service');
//    const { booking } = await getNotificationRecipients();
//    // booking.sms, booking.whatsapp, booking.email
//
//  Cache is invalidated whenever Company Settings are saved via
//  invalidateCompanyConfig() which is called in uiConfig.controller.js.
// ──────────────────────────────────────────────

const prisma = require('../config/database');
const { logger } = require('../config/logger');

// ─── In-process cache ─────────────────────────
let _cache = null;
let _loadedAt = null;
const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour max TTL as safety net

/**
 * Load company_global_config from UIConfig table.
 * Returns the configJson or null if not found.
 */
async function _loadFromDB() {
    try {
        const record = await prisma.uIConfig.findFirst({
            where: { key: 'company_global_config' },
            select: { configJson: true },
        });

        if (!record?.configJson) return null;

        let json = record.configJson;
        if (typeof json === 'string') {
            try { json = JSON.parse(json); } catch (_) { return null; }
        }
        return json;
    } catch (err) {
        logger.warn('[CompanyConfig] Failed to load from DB (non-fatal):', err.message);
        return null;
    }
}

/**
 * Get the parsed company config, using in-process cache.
 * On first call (or after invalidation), reads from DB.
 */
async function getCompanyConfig() {
    const now = Date.now();
    if (_cache && _loadedAt && (now - _loadedAt) < CACHE_TTL_MS) {
        return _cache;
    }

    logger.info('[CompanyConfig] Cache miss — loading from DB');
    _cache = await _loadFromDB();
    _loadedAt = now;
    return _cache;
}

/**
 * Invalidate the in-process cache.
 * Call this after Company Settings are saved.
 */
function invalidateCompanyConfig() {
    logger.info('[CompanyConfig] Cache invalidated');
    _cache = null;
    _loadedAt = null;
}

/**
 * Get notification recipients configuration.
 * Returns a safe object even if config is missing.
 *
 * Shape:
 * {
 *   booking: { sms: string|null, whatsapp: string|null, email: string|null },
 *   careers: { email: string|null }
 * }
 */
async function getNotificationRecipients() {
    const config = await getCompanyConfig();
    const notif = config?.notifications || {};

    return {
        booking: {
            sms:      notif?.booking?.sms      || null,
            whatsapp: notif?.booking?.whatsapp  || null,
            email:    notif?.booking?.email     || null,
        },
        careers: {
            email: notif?.careers?.email || null,
        },
    };
}

module.exports = {
    getCompanyConfig,
    getNotificationRecipients,
    invalidateCompanyConfig,
};
