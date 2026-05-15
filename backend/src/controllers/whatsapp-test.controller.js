// ──────────────────────────────────────────────
//  WhatsApp Test Controller
//  Admin endpoint to test Fast2SMS WABA templates
// ──────────────────────────────────────────────

const { logger } = require('../config/logger');
const { sendResponse } = require('../utils/helpers');
const { testWhatsAppTemplate, testAllTemplates, diagnoseWhatsApp } = require('../utils/test-whatsapp');

/**
 * POST /api/whatsapp-test/diagnose
 * Check if Fast2SMS connection is working
 */
const diagnoseFast2SMS = async (req, res, next) => {
    try {
        const apiKey = process.env.FAST2SMS_API_KEY;

        if (!apiKey) {
            return sendResponse(res, 400, null, 'FAST2SMS_API_KEY not configured');
        }

        const isValid = await diagnoseWhatsApp(apiKey);

        sendResponse(res, 200, { valid: isValid }, isValid ? 'Fast2SMS connection OK' : 'Fast2SMS connection failed');
    } catch (error) {
        logger.error('WhatsApp diagnostic error:', error);
        next(error);
    }
};

/**
 * POST /api/whatsapp-test/single
 * Test a single template
 * Body: { templateId, phoneNumber, variables: [] }
 */
const testSingleTemplate = async (req, res, next) => {
    try {
        const { templateId, phoneNumber, variables = [] } = req.body;

        if (!templateId || !phoneNumber) {
            return sendResponse(res, 400, null, 'templateId and phoneNumber are required');
        }

        const apiKey = process.env.FAST2SMS_API_KEY;
        if (!apiKey) {
            return sendResponse(res, 400, null, 'FAST2SMS_API_KEY not configured');
        }

        const result = await testWhatsAppTemplate(apiKey, templateId, phoneNumber, variables);

        sendResponse(res, result.success ? 200 : 400, result, result.success ? 'Template test sent' : 'Template test failed');
    } catch (error) {
        logger.error('WhatsApp single test error:', error);
        next(error);
    }
};

/**
 * POST /api/whatsapp-test/all
 * Test all 12 templates
 * Body: { phoneNumber }
 */
const testAllTemplatesEndpoint = async (req, res, next) => {
    try {
        const { phoneNumber } = req.body;

        if (!phoneNumber) {
            return sendResponse(res, 400, null, 'phoneNumber is required');
        }

        const apiKey = process.env.FAST2SMS_API_KEY;
        if (!apiKey) {
            return sendResponse(res, 400, null, 'FAST2SMS_API_KEY not configured');
        }

        // Run in background and return immediately
        const results = await testAllTemplates(apiKey, phoneNumber);

        sendResponse(res, 200, results, `All templates tested: ${results.passed}/${results.total} passed`);
    } catch (error) {
        logger.error('WhatsApp all templates test error:', error);
        next(error);
    }
};

/**
 * GET /api/whatsapp-test/templates
 * List all available templates with metadata
 */
const listTemplates = async (req, res, next) => {
    try {
        const templates = [
            {
                id: 20515,
                name: 'Verification Code',
                category: 'AUTHENTICATION',
                description: 'OTP verification (expires in 5 minutes)',
                variables: 2,
                variable_names: ['code', 'support_contact'],
            },
            {
                id: 20510,
                name: 'Ayuxa Remember',
                category: 'MARKETING',
                description: 'Wellness reminder',
                variables: 1,
                variable_names: ['user_name'],
            },
            {
                id: 20511,
                name: 'Birthday Wishes',
                category: 'MARKETING',
                description: 'Birthday greeting (supports image media)',
                variables: 1,
                variable_names: ['user_name'],
            },
            {
                id: 20512,
                name: 'Lab Test',
                category: 'UTILITY',
                description: 'Lab report ready notification',
                variables: 1,
                variable_names: ['user_name'],
            },
            {
                id: 20513,
                name: 'Urgent Alert (SOS)',
                category: 'UTILITY',
                description: 'Emergency SOS alert',
                variables: 2,
                variable_names: ['alert_type', 'user_id'],
            },
            {
                id: 20514,
                name: 'Welcome Flow',
                category: 'MARKETING',
                description: 'New user welcome (no body variables)',
                variables: 0,
                variable_names: [],
            },
            {
                id: 20519,
                name: 'Order Status',
                category: 'UTILITY',
                description: 'Order/booking status update',
                variables: 2,
                variable_names: ['customer_name', 'order_id'],
            },
            {
                id: 20520,
                name: 'Payment Successful',
                category: 'UTILITY',
                description: 'Payment confirmation',
                variables: 2,
                variable_names: ['customer_name', 'amount'],
            },
            {
                id: 20521,
                name: 'Booking Confirmation',
                category: 'UTILITY',
                description: 'Service booking confirmed',
                variables: 2,
                variable_names: ['customer_name', 'order_id'],
            },
            {
                id: 20522,
                name: 'Prescription Received',
                category: 'UTILITY',
                description: 'Doctor prescription upload confirmation',
                variables: 1,
                variable_names: ['customer_name'],
            },
            {
                id: 20523,
                name: 'Plan Expiry Reminder',
                category: 'MARKETING',
                description: 'Subscription plan expiry warning',
                variables: 1,
                variable_names: ['customer_name'],
            },
            {
                id: 20525,
                name: 'Feedback',
                category: 'MARKETING',
                description: 'Post-service feedback survey',
                variables: 1,
                variable_names: ['customer_name'],
            },
        ];

        sendResponse(res, 200, templates, 'All WhatsApp templates');
    } catch (error) {
        logger.error('List templates error:', error);
        next(error);
    }
};

module.exports = {
    diagnoseFast2SMS,
    testSingleTemplate,
    testAllTemplatesEndpoint,
    listTemplates,
};
