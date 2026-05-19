// ──────────────────────────────────────────────
//  Fast2SMS WhatsApp Provider
//
//  Implements the WhatsApp provider interface:
//    dispatch({ mobile, messageId, phoneNumberId, variables, mediaUrl, docFilename })
//    → Promise<{ success, requestId?, raw?, error? }>
//
//  Retry policy: 3 attempts, exponential backoff (500ms → 1s → 2s).
//  Only network / 5xx errors are retried; business-logic rejections are not.
//
//  Provider swap: to replace Fast2SMS with Meta Cloud API or Twilio,
//  create a new provider module with the same dispatch() signature
//  and swap it in whatsapp.service.js.
// ──────────────────────────────────────────────

const axios = require('axios');
const { logger } = require('../../config/logger');

const WHATSAPP_URL = process.env.FAST2SMS_WHATSAPP_URL || 'https://www.fast2sms.com/dev/whatsapp';
const MAX_RETRIES = 3;
const RETRY_BASE_DELAY_MS = 500;

/**
 * Dispatch a single WhatsApp template message.
 *
 * @param {object} opts
 * @param {string}   opts.mobile          - 10-digit Indian mobile number
 * @param {number}   opts.messageId       - Fast2SMS WABA message_id
 * @param {string}   opts.phoneNumberId   - Fast2SMS WABA phone_number_id for the sender account
 * @param {string[]} opts.variables       - Ordered variable values
 * @param {string}  [opts.mediaUrl]       - Optional media URL
 * @param {string}  [opts.docFilename]    - Optional document filename
 * @returns {Promise<{success:boolean, requestId?:string, raw?:object, error?:string}>}
 */
const dispatch = async ({ mobile, messageId, phoneNumberId, variables, mediaUrl, docFilename }) => {
    const apiKey = process.env.FAST2SMS_API_KEY;

    if (!apiKey) {
        logger.warn('[WA Provider] FAST2SMS_API_KEY not set — skipping (dev mode)');
        return { success: true, requestId: 'dev-mode' };
    }

    // Build query string (Fast2SMS WABA uses GET with query params)
    const buildUrl = () => {
        const params = new URLSearchParams({
            authorization: apiKey,
            message_id: String(messageId),
            phone_number_id: phoneNumberId,
            numbers: mobile,
        });

        if (variables && variables.length > 0) {
            params.append('variables_values', variables.map(String).join('|'));
        }
        if (mediaUrl) params.append('media_url', mediaUrl);
        if (docFilename) params.append('document_filename', docFilename);

        return `${WHATSAPP_URL}?${params.toString()}`;
    };

    const logPayload = {
        messageId,
        phoneNumberId,
        mobile,
        variables,
        mediaUrl: mediaUrl || null,
        timestamp: new Date().toISOString(),
    };
    logger.info('[WA Provider] Request:', logPayload);

    let attempt = 0;
    let lastError;

    while (attempt < MAX_RETRIES) {
        attempt++;
        try {
            const response = await axios.get(buildUrl(), { timeout: 12000 });
            const resData = response.data;

            logger.info(`[WA Provider] Response (attempt ${attempt}):`, {
                data: resData,
                timestamp: new Date().toISOString(),
            });

            if (resData?.return === true || resData?.status === 'sent') {
                return {
                    success: true,
                    requestId: resData.request_id || resData.message_id || null,
                    raw: resData,
                };
            }

            // Fast2SMS returns HTTP 200 even on business-logic rejection
            const errMsg = Array.isArray(resData?.message)
                ? resData.message.join('; ')
                : resData?.message || JSON.stringify(resData);

            logger.error(`[WA Provider] Rejected (attempt ${attempt}): ${errMsg}`);
            return { success: false, error: errMsg, raw: resData };

        } catch (error) {
            const status = error.response?.status;
            const errData = error.response?.data;
            const errMsg = typeof errData === 'string'
                ? errData.substring(0, 300)
                : JSON.stringify(errData) || error.message;

            logger.error(`[WA Provider] HTTP error (attempt ${attempt}/${MAX_RETRIES}) [${status || 'network'}]: ${errMsg}`);
            lastError = errMsg;

            // Do not retry on client-side 4xx
            if (status && status < 500) {
                return { success: false, error: errMsg };
            }

            if (attempt < MAX_RETRIES) {
                const delay = RETRY_BASE_DELAY_MS * Math.pow(2, attempt - 1);
                logger.info(`[WA Provider] Retrying in ${delay}ms...`);
                await new Promise(r => setTimeout(r, delay));
            }
        }
    }

    return { success: false, error: lastError };
};

module.exports = { dispatch };
