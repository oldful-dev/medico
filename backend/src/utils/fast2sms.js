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
            // Fast2SMS DLT required structure:
            // route: 'dlt', sender_id: 'XXXXXX', message: 'TEMPLATE_ID', variables_values: 'OTP', numbers: 'XXXXXXXXXX'
            response = await axios.post(FAST2SMS_URL, {
                route: 'dlt',
                sender_id: process.env.FAST2SMS_SENDER_ID || 'OLDFUL',
                message: process.env.FAST2SMS_OTP_TEMPLATE_ID,
                variables_values: otpCode,
                numbers: cleanNumber,
                flash: 0,
            }, {
                headers: { 
                    authorization: apiKey, 
                    'Content-Type': 'application/json',
                    'cache-control': 'no-cache'
                }
            });
            
            // Note: Fast2SMS sometimes requires DLT Entity ID in the header or body depending on their latest API revision.
            // If the above fails, you may need to add 'entity_id' to the body.
        }
        // Route 2: Quick SMS (only available route without DLT setup)
        else {
            routeUsed = 'q';
            response = await axios.get(FAST2SMS_URL, {
                params: {
                    authorization: apiKey,
                    route: 'q',
                    message,
                    language: 'english',
                    numbers: cleanNumber,
                    flash: 0,
                },
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
 * Send an explicit DLT Route SMS passing custom template ID and variables.
 * @param {string} phoneNumber 
 * @param {string} templateId - The Fast2SMS DLT Template ID (e.g. 211671)
 * @param {string[]} variablesArray - Array of dynamic values matching the {#var#} count
 */
const sendDLTSMS = async (phoneNumber, templateId, variablesArray = []) => {
    try {
        if (!process.env.FAST2SMS_API_KEY) {
            logger.warn('FAST2SMS_API_KEY not set. Simulating DLT SMS.');
            return true;
        }

        const cleanNumber = phoneNumber.replace(/\D/g, '').slice(-10);
        const variablesString = variablesArray.join('|'); // Fast2SMS expects pipe-separated values
        const apiKey = process.env.FAST2SMS_API_KEY;

        const response = await axios.post(FAST2SMS_URL, {
            route: 'dlt',
            sender_id: process.env.FAST2SMS_SENDER_ID || 'OLDFUL',
            message: templateId,
            variables_values: variablesString || "",
            numbers: cleanNumber,
            flash: 0,
        }, {
            headers: { 
                authorization: apiKey, 
                'Content-Type': 'application/json',
                'cache-control': 'no-cache'
            }
        });

        const resData = response.data;
        if (resData.return) {
            logger.info(`💬 DLT SMS sent to ${cleanNumber} [Template: ${templateId}]`);
            return true;
        } else {
            logger.error(`Fast2SMS DLT rejected: ${JSON.stringify(resData)}`);
            return false;
        }
    } catch (error) {
        logger.error(`Fast2SMS DLT Error: ${error.response?.data || error.message}`);
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
    sendDLTSMS,
    sendWhatsAppMessage,
};
