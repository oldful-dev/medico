// ──────────────────────────────────────────────
//  Firebase Remote Config Controller (SDUI)
//  Admin endpoints to manage Remote Config parameters
//  for Server-Driven UI without custom backend
// ──────────────────────────────────────────────

const { remoteConfig } = require('../config/firebase');
const { logger } = require('../config/logger');

/**
 * GET /api/remote-config/template
 * Fetch current Remote Config template (all parameters)
 */
const getTemplate = async (req, res, next) => {
    try {
        const template = await remoteConfig.getTemplate();
        const parameters = {};

        for (const [key, param] of Object.entries(template.parameters || {})) {
            parameters[key] = {
                defaultValue: param.defaultValue?.value || null,
                description: param.description || '',
                valueType: param.valueType || 'STRING',
            };
        }

        res.json({ success: true, data: { parameters, version: template.version } });
    } catch (error) {
        logger.error('Remote Config get template error:', error.message);
        next(error);
    }
};

/**
 * PUT /api/remote-config/parameters
 * Update Remote Config parameters (batch update)
 * Body: { parameters: { key: { value, description?, valueType? }, ... } }
 */
const updateParameters = async (req, res, next) => {
    try {
        const { parameters } = req.body;
        if (!parameters || typeof parameters !== 'object') {
            return res.status(400).json({ success: false, message: 'Parameters object required' });
        }

        // Fetch current template
        const template = await remoteConfig.getTemplate();

        // Update or add parameters
        for (const [key, config] of Object.entries(parameters)) {
            template.parameters[key] = {
                defaultValue: { value: typeof config.value === 'string' ? config.value : JSON.stringify(config.value) },
                description: config.description || template.parameters[key]?.description || '',
                valueType: config.valueType || 'STRING',
            };
        }

        // Publish updated template
        const validated = await remoteConfig.validateTemplate(template);
        await remoteConfig.publishTemplate(validated);

        logger.info(`Remote Config updated: ${Object.keys(parameters).join(', ')}`);
        res.json({ success: true, message: 'Remote Config parameters updated' });
    } catch (error) {
        logger.error('Remote Config update error:', error.message);
        next(error);
    }
};

/**
 * PUT /api/remote-config/parameter/:key
 * Update a single Remote Config parameter
 * Body: { value, description? }
 */
const updateSingleParameter = async (req, res, next) => {
    try {
        const { key } = req.params;
        const { value, description } = req.body;

        if (value === undefined) {
            return res.status(400).json({ success: false, message: 'Value is required' });
        }

        const template = await remoteConfig.getTemplate();

        template.parameters[key] = {
            defaultValue: { value: typeof value === 'string' ? value : JSON.stringify(value) },
            description: description || template.parameters[key]?.description || '',
        };

        const validated = await remoteConfig.validateTemplate(template);
        await remoteConfig.publishTemplate(validated);

        logger.info(`Remote Config parameter '${key}' updated`);
        res.json({ success: true, message: `Parameter '${key}' updated` });
    } catch (error) {
        logger.error(`Remote Config update '${req.params.key}' error:`, error.message);
        next(error);
    }
};

/**
 * DELETE /api/remote-config/parameter/:key
 * Remove a Remote Config parameter
 */
const deleteParameter = async (req, res, next) => {
    try {
        const { key } = req.params;
        const template = await remoteConfig.getTemplate();

        if (!template.parameters[key]) {
            return res.status(404).json({ success: false, message: `Parameter '${key}' not found` });
        }

        delete template.parameters[key];

        const validated = await remoteConfig.validateTemplate(template);
        await remoteConfig.publishTemplate(validated);

        logger.info(`Remote Config parameter '${key}' deleted`);
        res.json({ success: true, message: `Parameter '${key}' deleted` });
    } catch (error) {
        next(error);
    }
};

module.exports = { getTemplate, updateParameters, updateSingleParameter, deleteParameter };
