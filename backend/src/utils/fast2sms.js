// ──────────────────────────────────────────────
//  Fast2SMS Utility — thin compatibility shim
//
//  DLT SMS logic lives in src/services/sms/.
//  WhatsApp WABA stays here unchanged.
//
//  Existing callers of sendSMS() / sendDLTSMS() continue to work.
// ──────────────────────────────────────────────

const axios = require('axios');
const { logger } = require('../config/logger');
const { sendSMS: sendTemplateSMS, SMS_TEMPLATES } = require('../services/sms');
const prisma = require('../config/database');

const WHATSAPP_URL = 'https://www.fast2sms.com/dev/whatsapp';

// ─── sendSMS (legacy OTP helper) ─────────────────────────────────────────────
// Kept for backward-compat. Internally routes through template OTP_USER.
const sendSMS = async (phoneNumber, message) => {
    try {
        const otpMatch = message.match(/(\d{4,6})/);
        if (!otpMatch) {
            logger.error('[fast2sms] sendSMS: no OTP found in message');
            return false;
        }
        return await sendTemplateSMS({
            template: 'OTP_USER',
            mobile: phoneNumber,
            variables: [otpMatch[1]],
        });
    } catch (err) {
        logger.error('[fast2sms] sendSMS error:', err.message);
        return false;
    }
};

// ─── sendDLTSMS (legacy raw template helper) ──────────────────────────────────
// Allows callers to pass an arbitrary templateId without going through the registry.
// Use sendTemplateSMS() from sms/index.js for new code.
const sendDLTSMS = async (phoneNumber, templateId, variablesArray = []) => {
    try {
        if (!process.env.FAST2SMS_API_KEY) {
            logger.warn('[Fast2SMS] FAST2SMS_API_KEY not set — simulating DLT SMS.');
            return true;
        }

        const cleanNumber = String(phoneNumber).replace(/\D/g, '').slice(-10);
        const variablesString = variablesArray.length > 0
            ? variablesArray.map(String).join('|') + '|'
            : '';

        // Derive sender ID from template registry (fall back to env default)
        const tmplEntry = Object.values(SMS_TEMPLATES).find(t => t.templateId === String(templateId));
        const senderId = tmplEntry?.senderId || process.env.FAST2SMS_SENDER_ID || 'AYUXA';

        logger.info(`[Fast2SMS DLT] Sending to ${cleanNumber}, templateId=${templateId}, senderId=${senderId}, vars=${variablesString}`);

        const payload = {
            route: 'dlt',
            sender_id: senderId,
            message: String(templateId),
            variables_values: variablesString,
            numbers: cleanNumber,
            flash: 0,
        };

        if (process.env.FAST2SMS_DLT_ENTITY_ID) {
            payload.entity_id = process.env.FAST2SMS_DLT_ENTITY_ID;
        }

        const response = await axios.post(
            process.env.FAST2SMS_BASE_URL || 'https://www.fast2sms.com/dev/bulkV2',
            payload,
            {
                headers: { authorization: process.env.FAST2SMS_API_KEY, 'Content-Type': 'application/json' },
                timeout: 10000,
            }
        );

        const resData = response.data;
        const success = resData?.return === true;
        const reqId = resData?.request_id || 'n/a';

        if (success) {
            logger.info(`[Fast2SMS DLT] ✅ Sent to ${cleanNumber} [Template: ${templateId}, reqId: ${reqId}]`);
        } else {
            logger.error(`[Fast2SMS DLT] Rejected: ${JSON.stringify(resData)}`);
        }

        prisma.notificationLog.create({
            data: {
                channel: 'SMS',
                recipientType: 'anonymous',
                body: `[DLT] templateId:${templateId} vars:${JSON.stringify(variablesArray)}`,
                isSent: success,
                sentAt: success ? new Date() : null,
                errorMessage: success ? null : JSON.stringify(resData).substring(0, 500),
            },
        }).catch(e => logger.warn('[Fast2SMS DLT] Log write failed:', e.message));

        return success;

    } catch (error) {
        const errMsg = error.response?.data
            ? JSON.stringify(error.response.data).substring(0, 300)
            : error.message;
        logger.error(`[Fast2SMS DLT] Error [${error.response?.status || 'network'}]: ${errMsg}`);

        prisma.notificationLog.create({
            data: {
                channel: 'SMS',
                recipientType: 'anonymous',
                body: `[DLT] templateId:${templateId} vars:${JSON.stringify(variablesArray)}`,
                isSent: false,
                errorMessage: errMsg.substring(0, 500),
            },
        }).catch(e => logger.warn('[Fast2SMS DLT] Log write failed:', e.message));

        return false;
    }
};

// ─── WhatsApp WABA Templates ──────────────────────────────────────────────────

const WABA_TEMPLATES = {
    verification_code: 20515,
    ayuxa_remember: 20510,
    birthday_wishes: 20511,
    plan_expiry_reminder: 20523,
    feedback: 20525,
    lab_test: 20512,
    urgent_alert: 20513,
    order_status: 20519,
    payment_successful: 20520,
    booking_confirmation: 20521,
    prescription_received: 20522,
    welcome_flow: 20514,
};

const sendWhatsAppMessage = async (phoneNumber, templateName, variableValues = [], mediaUrl = null, documentFilename = null) => {
    try {
        if (!process.env.FAST2SMS_API_KEY) {
            logger.warn('[Fast2SMS WABA] FAST2SMS_API_KEY not set — simulating WhatsApp send.');
            return true;
        }

        const cleanNumber = String(phoneNumber).replace(/\D/g, '').slice(-10);
        const templateId = WABA_TEMPLATES[templateName];
        if (!templateId) {
            logger.warn(`[Fast2SMS WABA] Unknown template: ${templateName}`);
            return false;
        }

        const params = new URLSearchParams({
            authorization: process.env.FAST2SMS_API_KEY,
            message_id: templateId,
            phone_number_id: process.env.FAST2SMS_WABA_PHONE_NUMBER_ID || '1137788802753379',
            numbers: cleanNumber,
        });

        if (variableValues.length > 0) {
            params.append('variables_values', variableValues.map(String).join('|'));
        }
        if (mediaUrl) params.append('media_url', mediaUrl);
        if (documentFilename) params.append('document_filename', documentFilename);

        const response = await axios.get(`${WHATSAPP_URL}?${params.toString()}`, { timeout: 10000 });
        const resData = response.data;

        if (resData?.return === true || resData?.status === 'sent') {
            logger.info(`[Fast2SMS WABA] ✅ WhatsApp → +91${cleanNumber} [${templateName} / ID:${templateId}]`);
            return true;
        }

        logger.warn(`[Fast2SMS WABA] Rejected: ${JSON.stringify(resData)}`);
        return false;

    } catch (error) {
        const errMsg = error.response?.data
            ? JSON.stringify(error.response.data).substring(0, 200)
            : error.message;
        logger.error(`[Fast2SMS WABA] Error [${error.response?.status || 'network'}]: ${errMsg}`);
        return false;
    }
};

module.exports = {
    sendSMS,
    sendDLTSMS,
    sendWhatsAppMessage,
    WABA_TEMPLATES,
};
