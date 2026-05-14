// ──────────────────────────────────────────────
//  Fast2SMS Utility
//  Handles SMS OTPs and WhatsApp Notifications
// ──────────────────────────────────────────────

const axios = require('axios');
const { logger 
    
} = require('../config/logger');

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

        if (otpCode && process.env.FAST2SMS_OTP_TEMPLATE_ID) {
            // OTP format: pipe-separated with trailing pipe
            const variablesValues = otpCode + '|';

            const payload = {
                route: 'dlt',
                sender_id: process.env.FAST2SMS_SENDER_ID || 'AYUXA',
                message: process.env.FAST2SMS_OTP_TEMPLATE_ID,
                variables_values: variablesValues,
                numbers: cleanNumber,
                flash: 1,
            };

            if (process.env.FAST2SMS_ENTITY_ID) {
                payload.entity_id = process.env.FAST2SMS_ENTITY_ID;
            }

            const response = await axios.post(FAST2SMS_URL, payload, {
                headers: {
                    authorization: apiKey,
                    'Content-Type': 'application/json'
                }
            });

            const resData = response.data;
            logger.info(`Fast2SMS [dlt] response: ${JSON.stringify(resData)}`);

            if (resData.return === true) {
                logger.info(`💬 SMS sent to ${cleanNumber} via dlt route (request_id: ${resData.request_id || 'n/a'})`);
                return true;
            } else {
                logger.error(`Fast2SMS rejected [dlt]: ${JSON.stringify(resData)}`);
                return false;
            }
        } else {
            logger.error(`Cannot send SMS. DLT not configured (FAST2SMS_OTP_TEMPLATE_ID missing) or no OTP found in message.`);
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
 * @param {string} templateId - The Fast2SMS DLT Template ID (e.g. 215237, 215240, 215239)
 * @param {string[]} variablesArray - Array of dynamic values matching the {#var#} count
 *
 * Example: sendDLTSMS('9876543210', '215237', ['8473'])
 */
const sendDLTSMS = async (phoneNumber, templateId, variablesArray = []) => {
    try {
        if (!process.env.FAST2SMS_API_KEY) {
            logger.warn('FAST2SMS_API_KEY not set. Simulating DLT SMS.');
            return true;
        }

        const cleanNumber = phoneNumber.replace(/\D/g, '').slice(-10);
        // Fast2SMS expects pipe-separated values with trailing pipe
        const variablesString = variablesArray.length > 0
            ? variablesArray.join('|') + '|'
            : '';
        const apiKey = process.env.FAST2SMS_API_KEY;

        logger.info(`Fast2SMS DLT: sending to ${cleanNumber}, templateId=${templateId}, variables=${variablesString}`);

        const response = await axios.post(FAST2SMS_URL, {
            route: 'dlt',
            sender_id: process.env.FAST2SMS_SENDER_ID || 'AYUXA',
            message: templateId,
            variables_values: variablesString,
            numbers: cleanNumber,
            flash: 1,
        }, {
            headers: {
                authorization: apiKey,
                'Content-Type': 'application/json'
            }
        });

        const resData = response.data;
        if (resData.return === true) {
            logger.info(`💬 DLT SMS sent to ${cleanNumber} [Template: ${templateId}, Request ID: ${resData.request_id || 'n/a'}]`);
            return true;
        } else {
            logger.error(`Fast2SMS DLT rejected: ${JSON.stringify(resData)}`);
            return false;
        }
    } catch (error) {
        const errData = error.response?.data;
        const errStatus = error.response?.status;
        const errMsg = typeof errData === 'string' ? errData.substring(0, 500) : JSON.stringify(errData);
        logger.error(`Fast2SMS DLT Error [${errStatus || 'network'}]: ${errMsg || error.message}`);
        return false;
    }
};

/**
 * Send WhatsApp via Fast2SMS WABA Templates
 * Maps logical template names → Fast2SMS WABA template IDs
 *
 * Reference: https://docs.fast2sms.com/reference/get-waba-template-details
 */

// Template mapping: logical name → Fast2SMS WABA template ID
const WABA_TEMPLATES = {
    // Authentication
    verification_code: 20515,

    // Marketing
    ayuxa_remember: 20510,
    birthday_wishes: 20511,
    plan_expiry_reminder: 20523,
    feedback: 20525,

    // Utility
    lab_test: 20512,
    urgent_alert: 20513,
    order_status: 20519,
    payment_successful: 20520,
    booking_confirmation: 20521,
    prescription_received: 20522,

    // Onboarding
    welcome_flow: 20514,
};

/**
 * Send WhatsApp via Fast2SMS WABA Templates
 * @param {string} phoneNumber - Recipient phone (10 digits, any format)
 * @param {string} templateName - Key from WABA_TEMPLATES
 * @param {string[]} variableValues - Ordered variable values for {Var1}, {Var2}, etc.
 * @param {string} [mediaUrl] - Optional: URL for media (image/document)
 * @param {string} [documentFilename] - Optional: filename for document
 * @returns {Promise<boolean>}
 */
const sendWhatsAppMessage = async (phoneNumber, templateName, variableValues = [], mediaUrl = null, documentFilename = null) => {
    try {
        if (!process.env.FAST2SMS_API_KEY) {
            logger.warn('FAST2SMS_API_KEY not set. Simulating WhatsApp WABA send.');
            return true;
        }

        // Normalize phone to 10 digits
        const cleanNumber = phoneNumber.replace(/\D/g, '').slice(-10);

        // Get template ID
        const templateId = WABA_TEMPLATES[templateName];
        if (!templateId) {
            logger.warn(`[Fast2SMS WABA] Unknown template: ${templateName}. Skipping send.`);
            return false;
        }

        const apiKey = process.env.FAST2SMS_API_KEY;

        // Build query params
        const params = new URLSearchParams({
            authorization: apiKey,
            message_id: templateId,
            phone_number_id: process.env.FAST2SMS_WABA_PHONE_NUMBER_ID || '1137788802753379',
            numbers: cleanNumber,
        });

        // Add variables if provided
        if (variableValues.length > 0) {
            params.append('variables_values', variableValues.map(String).join('|'));
        }

        // Add media URL if provided
        if (mediaUrl) {
            params.append('media_url', mediaUrl);
        }

        // Add document filename if provided
        if (documentFilename) {
            params.append('document_filename', documentFilename);
        }

        const url = `${WHATSAPP_URL}?${params.toString()}`;

        const response = await axios.get(url, {
            timeout: 10000,
        });

        const resData = response.data;

        if (resData.return === true || resData.status === 'sent') {
            logger.info(`[Fast2SMS WABA] ✅ WhatsApp → +91${cleanNumber} [${templateName} / ID:${templateId}]`);
            return true;
        }

        logger.warn(`[Fast2SMS WABA] Rejected: ${JSON.stringify(resData)}`);
        return false;

    } catch (error) {
        const errData = error.response?.data;
        const errStatus = error.response?.status;
        const errMsg = typeof errData === 'string' ? errData.substring(0, 200) : JSON.stringify(errData);
        logger.error(`[Fast2SMS WABA] Error [${errStatus || 'network'}]: ${errMsg || error.message}`);
        return false;
    }
};

module.exports = {
    sendSMS,
    sendDLTSMS,
    sendWhatsAppMessage,
    WABA_TEMPLATES,
};
