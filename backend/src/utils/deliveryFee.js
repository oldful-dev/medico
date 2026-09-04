// ──────────────────────────────────────────────
//  Wellness Delivery Fee
//
//  Rule: below the threshold, a flat fee applies; at/above it, free
//  delivery. Prepaid and COD have separate thresholds/fees.
//
//  Config lives in a UIConfig row (key WELLNESS_DELIVERY_FEE_CONFIG),
//  mirroring the existing WELLNESS_STORE_STATUS pattern in
//  wellness.controller.js — auto-seed on first read, admin-editable via
//  upsert, no dedicated table/migration needed.
// ──────────────────────────────────────────────

const prisma = require('../config/database');

const DELIVERY_FEE_CONFIG_KEY = 'WELLNESS_DELIVERY_FEE_CONFIG';

const DEFAULT_DELIVERY_FEE_CONFIG = {
    prepaidThreshold: 500,
    prepaidFee: 99,
    codThreshold: 1000,
    codFee: 99,
};

/**
 * Read the current delivery-fee config, seeding it with the default on
 * first call so callers never have to null-check.
 */
const getDeliveryFeeConfig = async () => {
    let row = await prisma.uIConfig.findUnique({ where: { key: DELIVERY_FEE_CONFIG_KEY } });

    if (!row) {
        row = await prisma.uIConfig.create({
            data: {
                key: DELIVERY_FEE_CONFIG_KEY,
                label: 'Wellness Delivery Fee',
                configJson: DEFAULT_DELIVERY_FEE_CONFIG,
            },
        });
    }

    // Fall back per-field so a partially-set configJson (e.g. from a future
    // admin edit that only touches some fields) never produces NaN/undefined.
    const stored = row.configJson || {};
    return { ...DEFAULT_DELIVERY_FEE_CONFIG, ...stored };
};

/**
 * Pure calculation — no DB access, easy to unit-test.
 * @param {number} subtotal - order subtotal (before the delivery fee itself)
 * @param {boolean} isCOD
 * @param {{prepaidThreshold:number, prepaidFee:number, codThreshold:number, codFee:number}} config
 * @returns {number}
 */
const calculateDeliveryFee = (subtotal, isCOD, config) => {
    const threshold = isCOD ? config.codThreshold : config.prepaidThreshold;
    const fee = isCOD ? config.codFee : config.prepaidFee;
    return subtotal >= threshold ? 0 : fee;
};

module.exports = {
    DELIVERY_FEE_CONFIG_KEY,
    DEFAULT_DELIVERY_FEE_CONFIG,
    getDeliveryFeeConfig,
    calculateDeliveryFee,
};
