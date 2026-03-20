// ──────────────────────────────────────────────
//  Fast2SMS Utility
//  Handles SMS OTPs and WhatsApp Notifications
// ──────────────────────────────────────────────

const axios = require('axios');
const { logger } = require('../config/logger');

const FAST2SMS_URL = 'https://www.fast2sms.com/dev/bulkV2';
const WHATSAPP_URL = 'https://www.fast2sms.com/dev/whatsapp'; // Example endpoint, will adjust based on exact docs

/**
 * Send SMS via Fast2SMS (Quick Transactional Route)
 */
const sendSMS = async (phoneNumber, message) => {
    try {
        if (!process.env.FAST2SMS_API_KEY) {
            logger.warn('FAST2SMS_API_KEY not set. Simulating SMS send.');
            return true;
        }

        const cleanNumber = phoneNumber.replace(/\D/g, '').slice(-10);

        // Extract OTP digits from message for the OTP route
        const otpMatch = message.match(/(\d{4,6})/);
        const otpCode = otpMatch ? otpMatch[1] : null;

        let response;

        if (otpCode && process.env.FAST2SMS_OTP_TEMPLATE_ID) {
            // DLT-registered template route — most reliable for OTP delivery
            response = await axios.post(FAST2SMS_URL, {
                route: 'dlt',
                sender_id: process.env.FAST2SMS_SENDER_ID || 'OLDFHL',
                message: process.env.FAST2SMS_OTP_TEMPLATE_ID,
                variables_values: otpCode,
                numbers: cleanNumber,
                flash: 0,
            }, {
                headers: {
                    'authorization': process.env.FAST2SMS_API_KEY,
                    'Content-Type': 'application/json'
                }
            });
        } else if (otpCode) {
            // Fast2SMS OTP route — auto-generates template
            response = await axios.get('https://www.fast2sms.com/dev/bulkV2', {
                params: {
                    authorization: process.env.FAST2SMS_API_KEY,
                    route: 'otp',
                    variables_values: otpCode,
                    numbers: cleanNumber,
                    flash: 0,
                },
            });
        } else {
            // Quick route fallback for non-OTP messages
            response = await axios.post(FAST2SMS_URL, {
                route: 'q',
                message,
                language: 'english',
                numbers: cleanNumber,
            }, {
                headers: {
                    'authorization': process.env.FAST2SMS_API_KEY,
                    'Content-Type': 'application/json'
                }
            });
        }

        logger.info(`Fast2SMS response: ${JSON.stringify(response.data)}`);

        if (response.data.return) {
            logger.info(`💬 SMS sent to ${cleanNumber} via ${otpCode ? 'otp' : 'q'} route (request_id: ${response.data.request_id || 'n/a'})`);
            return true;
        } else {
            logger.error(`Fast2SMS rejected: ${JSON.stringify(response.data)}`);
            throw new Error(response.data.message || 'Fast2SMS error');
        }
    } catch (error) {
        logger.error('Fast2SMS SMS Error:', JSON.stringify(error.response?.data || error.message));
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

        // Logic based on Fast2SMS WhatsApp Business API structure
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
