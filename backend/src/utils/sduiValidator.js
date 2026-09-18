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
        const seenSectionIds = new Set();
        config.sections.forEach((section, i) => {
            if (!isPlainObject(section)) {
                errors.push(`sections[${i}] must be an object`);
                return;
            }
            if (typeof section.id !== 'string') errors.push(`sections[${i}].id must be a string`);
            if (typeof section.type !== 'string') errors.push(`sections[${i}].type must be a string`);
            if (typeof section.enabled !== 'boolean') errors.push(`sections[${i}].enabled must be a boolean`);

            // Two real production incidents were both silently-saved
            // structural corruption a shape-only check like the above
            // never caught: a section's id got duplicated/randomized when
            // deleted and re-added, and every item across two sections
            // ended up sharing one id ("nurse_care"), breaking React's
            // reconciliation on the mobile app. Reject both outright.
            if (typeof section.id === 'string') {
                if (seenSectionIds.has(section.id)) {
                    errors.push(`sections[${i}].id "${section.id}" is a duplicate of another section — every section must have a unique id.`);
                }
                seenSectionIds.add(section.id);
            }
            if (Array.isArray(section.services)) {
                const seenItemIds = new Set();
                section.services.forEach((item, j) => {
                    if (!isPlainObject(item) || typeof item.id !== 'string') {
                        errors.push(`sections[${i}].services[${j}].id must be a string`);
                        return;
                    }
                    if (seenItemIds.has(item.id)) {
                        errors.push(`sections[${i}].services[${j}].id "${item.id}" is a duplicate within section "${section.id}" — every item in a section must have a unique id.`);
                    }
                    seenItemIds.add(item.id);
                });
            }
        });
    }

    return { valid: errors.length === 0, errors };
};

module.exports = { validateAppConfig, validateHomeConfig };
