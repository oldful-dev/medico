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

        const response = await axios.post(FAST2SMS_URL, {
            route: 'q', // Quick transactional
            message: message,
            language: 'english',
            numbers: phoneNumber.replace(/\D/g, ''),
        }, {
            headers: {
                'authorization': process.env.FAST2SMS_API_KEY,
                'Content-Type': 'application/json'
            }
        });

        if (response.data.return) {
            logger.info(`💬 SMS sent to ${phoneNumber}`);
            return true;
        } else {
            throw new Error(response.data.message || 'Fast2SMS error');
        }
    } catch (error) {
        logger.error('Fast2SMS SMS Error:', error.response?.data || error.message);
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

        // Logic based on Fast2SMS WhatsApp Business API structure
        const response = await axios.post(`${WHATSAPP_URL}/send`, {
            phone: phoneNumber.replace(/\D/g, ''),
            template_name: templateName,
            body: parameters,
        }, {
            headers: {
                'authorization': process.env.FAST2SMS_WHATSAPP_API_KEY,
                'Content-Type': 'application/json'
            }
        });

        logger.info(`📱 WhatsApp sent to ${phoneNumber}`);
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
