// ──────────────────────────────────────────────
//  WhatsApp Validator
//  All input validation before a send is attempted.
// ──────────────────────────────────────────────

const { WHATSAPP_TEMPLATES, WABA_ACCOUNTS } = require('./templates');

class WhatsAppValidationError extends Error {
    constructor(message, field) {
        super(message);
        this.name = 'WhatsAppValidationError';
        this.field = field;
        this.statusCode = 400;
    }
}

/**
 * Normalise and validate an Indian mobile number.
 * Accepts: "9876543210", "+919876543210", "919876543210"
 * Returns: 10-digit string.
 */
const validateMobile = (mobile) => {
    const clean = String(mobile || '').replace(/\D/g, '').slice(-10);
    if (!/^[6-9]\d{9}$/.test(clean)) {
        throw new WhatsAppValidationError(
            `Invalid Indian mobile number: "${mobile}"`,
            'mobile'
        );
    }
    return clean;
};

/**
 * Resolve and validate a template key.
 * Returns the template config object.
 */
const validateTemplate = (templateKey) => {
    const tmpl = WHATSAPP_TEMPLATES[templateKey];
    if (!tmpl) {
        throw new WhatsAppValidationError(
            `Unknown WhatsApp template: "${templateKey}". Valid keys: ${Object.keys(WHATSAPP_TEMPLATES).join(', ')}`,
            'template'
        );
    }
    return tmpl;
};

/**
 * Validate that the supplied variables array matches the template's expected count.
 */
const validateVariables = (templateKey, tmpl, variables) => {
    if (!Array.isArray(variables)) {
        throw new WhatsAppValidationError('variables must be an array', 'variables');
    }
    if (variables.length !== tmpl.variables) {
        throw new WhatsAppValidationError(
            `Template "${templateKey}" expects ${tmpl.variables} variable(s), got ${variables.length}`,
            'variables'
        );
    }
};

/**
 * Validate media requirements.
 */
const validateMedia = (templateKey, tmpl, mediaUrl, docFilename) => {
    if (tmpl.mediaRequired && !mediaUrl) {
        throw new WhatsAppValidationError(
            `Template "${templateKey}" requires a media_url`,
            'mediaUrl'
        );
    }
    if (tmpl.docRequired && !docFilename) {
        throw new WhatsAppValidationError(
            `Template "${templateKey}" requires a document_filename`,
            'docFilename'
        );
    }
};

/**
 * Validate that the WABA account exists in our registry.
 */
const validateWABA = (waba) => {
    if (!WABA_ACCOUNTS[waba]) {
        throw new WhatsAppValidationError(
            `Unknown WABA account: "${waba}". Valid: ${Object.keys(WABA_ACCOUNTS).join(', ')}`,
            'waba'
        );
    }
    return WABA_ACCOUNTS[waba];
};

/**
 * Run all validations for a sendWhatsApp() call.
 * Returns { cleanMobile, tmpl, wabaConfig } on success.
 */
const validateSendPayload = ({ template, mobile, variables = [], mediaUrl, docFilename }) => {
    const cleanMobile = validateMobile(mobile);
    const tmpl = validateTemplate(template);
    validateVariables(template, tmpl, variables);
    validateMedia(template, tmpl, mediaUrl, docFilename);
    const wabaConfig = validateWABA(tmpl.waba);
    return { cleanMobile, tmpl, wabaConfig };
};

module.exports = { validateSendPayload, validateMobile, WhatsAppValidationError };
