// ──────────────────────────────────────────────
//  SDUI Config Validator
//  Structural shape checks only — just enough to guarantee mobile's
//  AppConfigContext.tsx can dereference config.screens.home.sections etc.
//  without crashing. Not a full schema language (see plan notes).
// ──────────────────────────────────────────────

const isPlainObject = (v) => typeof v === 'object' && v !== null && !Array.isArray(v);

/**
 * Validate the full SDUI app config (PUT /api/app-config).
 * @returns {{ valid: boolean, errors: string[] }}
 */
const validateAppConfig = (config) => {
    const errors = [];
    if (!isPlainObject(config)) {
        return { valid: false, errors: ['config must be an object'] };
    }

    if (!isPlainObject(config.feature_flags)) {
        errors.push('feature_flags must be an object');
    }
    if (!isPlainObject(config.screens)) {
        errors.push('screens must be an object');
    } else {
        if (!isPlainObject(config.screens.home) || !Array.isArray(config.screens.home.sections)) {
            errors.push('screens.home.sections must be an array');
        }
        if (!isPlainObject(config.screens.plans) || !Array.isArray(config.screens.plans.plans)) {
            errors.push('screens.plans.plans must be an array');
        }
        if (!isPlainObject(config.screens.city_selection) || !Array.isArray(config.screens.city_selection.cities)) {
            errors.push('screens.city_selection.cities must be an array');
        }
        if (!isPlainObject(config.screens.language_selection) || !Array.isArray(config.screens.language_selection.languages)) {
            errors.push('screens.language_selection.languages must be an array');
        }
    }

    return { valid: errors.length === 0, errors };
};

/**
 * Validate the home-screen-only SDUI config (PUT /api/app-config/home).
 * @returns {{ valid: boolean, errors: string[] }}
 */
const validateHomeConfig = (config) => {
    const errors = [];
    if (!isPlainObject(config)) {
        return { valid: false, errors: ['config must be an object'] };
    }

    if (!Array.isArray(config.sections)) {
        errors.push('sections must be an array');
    } else {
        config.sections.forEach((section, i) => {
            if (!isPlainObject(section)) {
                errors.push(`sections[${i}] must be an object`);
                return;
            }
            if (typeof section.id !== 'string') errors.push(`sections[${i}].id must be a string`);
            if (typeof section.type !== 'string') errors.push(`sections[${i}].type must be a string`);
            if (typeof section.visible !== 'boolean') errors.push(`sections[${i}].visible must be a boolean`);
        });
    }

    return { valid: errors.length === 0, errors };
};

module.exports = { validateAppConfig, validateHomeConfig };
