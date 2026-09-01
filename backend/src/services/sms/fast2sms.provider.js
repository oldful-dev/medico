// ──────────────────────────────────────────────
//  Fast2SMS DLT Provider
//  Handles raw HTTP calls to Fast2SMS bulk DLT API with retry + logging.
// ──────────────────────────────────────────────

const axios = require('axios');
const { logger } = require('../../config/logger');

const BASE_URL = process.env.FAST2SMS_BASE_URL || 'https://www.fast2sms.com/dev/bulkV2';
const MAX_RETRIES = 3;
const RETRY_BASE_DELAY_MS = 500;

/**
 * Send a single DLT SMS via Fast2SMS.
 * @param {object} params
 * @param {string} params.mobile        - 10-digit Indian mobile number
 * @param {string} params.senderId      - DLT registered sender ID (e.g. 'AYUXA')
 * @param {string} params.templateId    - Fast2SMS DLT template ID string
 * @param {string} params.variables     - Pipe-separated variable string, trailing pipe included
 * @returns {Promise<{success: boolean, requestId?: string, raw?: object, error?: string}>}
 */
const dispatchSMS = async ({ mobile, senderId, templateId, variables }) => {
    const apiKey = process.env.FAST2SMS_API_KEY;

    if (!apiKey) {
        logger.warn('[Fast2SMS] FAST2SMS_API_KEY not set — skipping real send (dev mode)');
        return { success: true, requestId: 'dev-mode' };
    }

    const payload = {
        route: 'dlt',
        sender_id: senderId,
        message: templateId,
        variables_values: variables,
        numbers: mobile,
        flash: 0,
    };

    if (process.env.FAST2SMS_DLT_ENTITY_ID) {
        payload.entity_id = process.env.FAST2SMS_DLT_ENTITY_ID;
    }

    // Never log variables_values — this is the actual message content and
    // for OTP templates that means the OTP code itself. This module has no
    // visibility into which templates are OTP vs not (it only sees a DLT
    // template ID string), so treat all message content as sensitive here.
    logger.info('[Fast2SMS] Request payload:', {
        route: payload.route,
        sender_id: payload.sender_id,
        message: payload.message,
        numbers: payload.numbers,
        timestamp: new Date().toISOString(),
    });

    let attempt = 0;
    let lastError;

    while (attempt < MAX_RETRIES) {
        attempt++;
        try {
            const response = await axios.post(BASE_URL, payload, {
                headers: {
                    authorization: apiKey,
                    'Content-Type': 'application/json',
                },
                timeout: 10000,
            });

            const resData = response.data;
            logger.info(`[Fast2SMS] Response (attempt ${attempt}):`, {
                data: resData,
                timestamp: new Date().toISOString(),
            });

            if (resData?.return === true) {
                return { success: true, requestId: resData.request_id || null, raw: resData };
            }

            // Fast2SMS returns HTTP 200 even on business-logic failures
            const errMsg = resData?.message || JSON.stringify(resData);
            logger.error(`[Fast2SMS] Rejected (attempt ${attempt}): ${errMsg}`);
            lastError = errMsg;

            // Do not retry on API-level rejection (wrong template ID, bad sender, etc.)
            return { success: false, error: errMsg, raw: resData };

        } catch (error) {
            const status = error.response?.status;
            const errData = error.response?.data;
            const errMsg = typeof errData === 'string'
                ? errData.substring(0, 300)
                : JSON.stringify(errData) || error.message;

            logger.error(`[Fast2SMS] HTTP error (attempt ${attempt}/${MAX_RETRIES}): [${status || 'network'}] ${errMsg}`);
            lastError = errMsg;

            // Only retry on network/5xx errors
            if (status && status < 500) {
                return { success: false, error: errMsg };
            }

            if (attempt < MAX_RETRIES) {
                const delay = RETRY_BASE_DELAY_MS * Math.pow(2, attempt - 1);
                logger.info(`[Fast2SMS] Retrying in ${delay}ms...`);
                await new Promise(r => setTimeout(r, delay));
            }
        }
    }

    return { success: false, error: lastError };
};

module.exports = { dispatchSMS };
