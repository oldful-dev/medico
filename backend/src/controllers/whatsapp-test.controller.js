// ──────────────────────────────────────────────
//  WhatsApp Test Controller
//  Admin endpoint to test Fast2SMS WABA templates
// ──────────────────────────────────────────────

const { logger } = require('../config/logger');
const { sendResponse } = require('../utils/helpers');
const { testWhatsAppTemplate, testAllTemplates, diagnoseWhatsApp } = require('../utils/test-whatsapp');
const { WHATSAPP_TEMPLATES, WABA_ACCOUNTS } = require('../services/whatsapp/templates');

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
 * Test a single template by registry key.
 * Body: { templateKey, phoneNumber, variables?: [] }
 * Legacy: also accepts { templateId, phoneNumberId, phoneNumber, variables }
 */
const testSingleTemplate = async (req, res, next) => {
    try {
        const { templateKey, templateId, phoneNumberId, phoneNumber, variables = [] } = req.body;

        if (!phoneNumber) {
            return sendResponse(res, 400, null, 'phoneNumber is required');
        }

        const apiKey = process.env.FAST2SMS_API_KEY;
        if (!apiKey) {
            return sendResponse(res, 400, null, 'FAST2SMS_API_KEY not configured');
        }

        let msgId, pnId;

        if (templateKey) {
            // Preferred: look up from registry
            const tmpl = WHATSAPP_TEMPLATES[templateKey];
            if (!tmpl) {
                return sendResponse(res, 400, null, `Unknown template key: "${templateKey}". Valid: ${Object.keys(WHATSAPP_TEMPLATES).join(', ')}`);
            }
            msgId = tmpl.messageId;
            pnId = WABA_ACCOUNTS[tmpl.waba]?.phoneNumberId;
        } else if (templateId && phoneNumberId) {
            // Legacy: raw IDs
            msgId = templateId;
            pnId = phoneNumberId;
        } else {
            return sendResponse(res, 400, null, 'templateKey (or templateId + phoneNumberId) is required');
        }

        const result = await testWhatsAppTemplate(apiKey, msgId, pnId, phoneNumber, variables);

        sendResponse(res, result.success ? 200 : 400, result, result.success ? 'Template test sent' : 'Template test failed');
    } catch (error) {
        logger.error('WhatsApp single test error:', error);
        next(error);
    }
};

/**
 * POST /api/whatsapp-test/all
 * Test all non-media templates.
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

        const results = await testAllTemplates(apiKey, phoneNumber);

        sendResponse(res, 200, results, `All templates tested: ${results.passed}/${results.total} passed`);
    } catch (error) {
        logger.error('WhatsApp all templates test error:', error);
        next(error);
    }
};

/**
 * GET /api/whatsapp-test/templates
 * List all registered templates with full metadata (sourced live from registry).
 */
const listTemplates = async (req, res, next) => {
    try {
        const templates = Object.entries(WHATSAPP_TEMPLATES).map(([key, tmpl]) => ({
            key,
            messageId: tmpl.messageId,
            waba: tmpl.waba,
            wabaLabel: WABA_ACCOUNTS[tmpl.waba]?.label || tmpl.waba,
            phoneNumberId: WABA_ACCOUNTS[tmpl.waba]?.phoneNumberId,
            variables: tmpl.variables,
            mediaRequired: tmpl.mediaRequired,
            docRequired: tmpl.docRequired,
            description: tmpl.description,
        }));

        sendResponse(res, 200, templates, `${templates.length} WhatsApp templates registered`);
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
