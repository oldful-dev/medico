// ──────────────────────────────────────────────
//  Fast2SMS Utility
//  Handles SMS OTPs and WhatsApp Notifications
// ──────────────────────────────────────────────

const axios = require('axios');
const { logger } = require('../config/logger');

const FAST2SMS_URL = 'https://www.fast2sms.com/dev/bulkV2';
const WHATSAPP_URL = 'https://www.fast2sms.com/dev/whatsapp';

/**
 * Send SMS via Fast2SMS
 * Tries routes in order: DLT (if configured) → OTP → Quick
 */
const sendSMS = async (phoneNumber, message) => {
    try {
        if (!process.env.FAST2SMS_API_KEY) {
            logger.warn('FAST2SMS_API_KEY not set. Simulating SMS send.');
            return true;
        }

        const cleanNumber = phoneNumber.replace(/\D/g, '').slice(-10);
        const otpMatch = message.match(/(\d{4,6})/);
        const otpCode = otpMatch ? otpMatch[1] : null;
        const apiKey = process.env.FAST2SMS_API_KEY;

        logger.info(`Fast2SMS: sending to ${cleanNumber}, otpCode=${otpCode ? 'yes' : 'no'}, keyLen=${apiKey.length}`);

        let response;
        let routeUsed = 'q';

        // Route 1: DLT registered template (most reliable, needs setup)
        if (otpCode && process.env.FAST2SMS_OTP_TEMPLATE_ID) {
            routeUsed = 'dlt';
            response = await axios.post(FAST2SMS_URL, {
                route: 'dlt',
                sender_id: process.env.FAST2SMS_SENDER_ID || 'OLDFHL',
                message: process.env.FAST2SMS_OTP_TEMPLATE_ID,
                variables_values: otpCode,
                numbers: cleanNumber,
                flash: 0,
            }, {
                headers: { authorization: apiKey, 'Content-Type': 'application/json' }
            });
        }
        // Route 2: OTP route (bypasses DND — reliable for verification codes)
        else if (otpCode) {
            routeUsed = 'otp';
            response = await axios.get(FAST2SMS_URL, {
                params: {
                    authorization: apiKey,
                    route: 'otp',
                    variables_values: otpCode,
                    numbers: cleanNumber,
                    flash: 0,
                },
            });
        }
        // Route 3: Quick transactional fallback (non-OTP messages)
        else {
            routeUsed = 'q';
            response = await axios.post(FAST2SMS_URL, {
                route: 'q',
                message,
                language: 'english',
                numbers: cleanNumber,
            }, {
                headers: { authorization: apiKey, 'Content-Type': 'application/json' }
            });
        }

        const resData = response.data;
        logger.info(`Fast2SMS [${routeUsed}] response: ${JSON.stringify(resData)}`);

        if (resData.return) {
            logger.info(`💬 SMS sent to ${cleanNumber} via ${routeUsed} route (id: ${resData.request_id || 'n/a'})`);
            return true;
        } else {
            logger.error(`Fast2SMS rejected [${routeUsed}]: ${JSON.stringify(resData)}`);
            return false;
        }
    } catch (error) {
        const errData = error.response?.data;
        const errStatus = error.response?.status;
        const errMsg = typeof errData === 'string' ? errData.substring(0, 500) : JSON.stringify(errData);
        logger.error(`Fast2SMS Error [${errStatus || 'network'}]: ${errMsg || error.message}`);
        return false;
    }
};

/**
 * Send WhatsApp via Fast2SMS
 */
const sendWhatsAppMessage = async (phoneNumber, templateName, parameters = []) => {
    try {
        if (!process.env.FAST2SMS_WHATSAPP_API_KEY) {
            logger.warn('FAST2SMS_WHATSAPP_API_KEY not set. Simulating WhatsApp send.');
            return true;
        }

        const cleanNumber = phoneNumber.replace(/\D/g, '').slice(-10);

        const response = await axios.post(`${WHATSAPP_URL}/send`, {
            phone: cleanNumber,
            template_name: templateName,
            body: parameters,
        }, {
            headers: {
                'authorization': process.env.FAST2SMS_WHATSAPP_API_KEY,
                'Content-Type': 'application/json'
            }
        });

        logger.info(`📱 WhatsApp sent to ${cleanNumber}`);
        return true;
    } catch (error) {
        logger.error('Fast2SMS WhatsApp Error:', error.response?.data || error.message);
        return false;
    }
};

module.exports = {
    sendSMS,
    sendWhatsAppMessage,
};
