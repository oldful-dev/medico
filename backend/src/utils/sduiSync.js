const prisma = require('../config/database');
const { logger } = require('../config/logger');

// Match config service items with database service slugs
const matchConfigToDb = (configId, configRoute, dbSlug, dbRoute) => {
    const cleanId = (configId || '').toLowerCase().replace(/_/g, '-');
    const cleanSlug = (dbSlug || '').toLowerCase().replace(/_/g, '-');
    if (cleanId === cleanSlug) return true;
    
    const cleanRoute1 = (configRoute || '').toLowerCase().replace(/^\//, '');
    const cleanRoute2 = (dbRoute || '').toLowerCase().replace(/^\//, '');
    if (cleanRoute1 && cleanRoute1 === cleanSlug) return true;
    if (cleanRoute1 && cleanRoute2 && cleanRoute1 === cleanRoute2) return true;

    // Special mappings
    const mappings = {
        'ac_repair': 'appliance-repair',
        'plumbing': 'plumbing-electrical',
        'cleaning': 'deep-cleaning',
        'driver': 'driving-cab',
        'bills': 'bill-payment',
        'bank': 'bank-paperwork',
        'grocery': 'grocery-run',
        'anything': 'anything-else',
        // trip-travels' slug/route are unchanged by the admin-services
        // restructure (only its `category` moved to TOURS_TRAVEL, for
        // admin-page grouping) — this mapping stays valid as-is, and the
        // essentials-grid exclusion above keeps it out of that section.
        'trip_travel': 'trip-travels',
        'paper_legal': 'paper-legal',
        'tech_helper': 'tech-helper',
        'smart_upgrade': 'smart-upgrade',
        'doctor': 'doctor-visit',
        'doctor_quick': 'doctor-visit',
        'nursing': 'nurse-care',
        'nurse_quick': 'nurse-care',
        'emergency': 'sos-emergency',
        'doctor_visit': 'doctor-visit',
        'homing_nursing': 'nurse-care',
        'fitness': 'physio-fitness',
        'physio_quick': 'physio-fitness',
        'equipment': 'medical-equipment',
        'medicines': 'order-medicines',
        'meal': 'meal-service',
        'hospital_trip': 'hospital-trip',
        'hospital_quick': 'hospital-trip',
        'physio': 'physio-fitness',
        'scan_ecg': 'scan-ecg'
    };

    if (mappings[configId] === dbSlug) return true;
    return false;
};

/**
 * Syncs the status of Database Services based on the newly published UIConfig home config.
 * Called when an admin updates the Server-Driven UI layout config.
 */
const syncUIConfigToDbServices = async (config, sourceKey = 'home_config') => {
    if (!config || !config.sections) return;
    try {
        const dbServices = await prisma.service.findMany();
        const updates = [];

        // Determine if config is in SDUI format (config.screens.home.sections) or simple Home config format (config.sections)
        const isSduiFormat = !!(config.screens && config.screens.home);
        const sectionsList = isSduiFormat ? config.screens.home.sections : config.sections;

        for (const dbSvc of dbServices) {
            let foundInConfig = false;
            let configIsEnabled = false;
            let configIcon = null;
            let configLabel = null;

            for (const section of (sectionsList || [])) {
                const itemsList = section.services || section.items || [];
                for (const item of (itemsList || [])) {
                    if (matchConfigToDb(item.id, item.route, dbSvc.slug, dbSvc.route)) {
                        foundInConfig = true;
                        if (item.enabled || item.visible) {
                            configIsEnabled = true;
                        }
                        const itemIcon = item.icon || item.icon_key;
                        if (itemIcon) {
                            configIcon = itemIcon;
                        }
                        const itemLabel = item.label;
                        if (itemLabel) {
                            configLabel = itemLabel;
                        }
                    }
                }
            }

            if (foundInConfig) {
                const dataToUpdate = {};
                let needsUpdate = false;

                if (dbSvc.isEnabled !== configIsEnabled) {
                    dataToUpdate.isEnabled = configIsEnabled;
                    needsUpdate = true;
                }
                if (configIcon && dbSvc.icon !== configIcon) {
                    dataToUpdate.icon = configIcon;
                    needsUpdate = true;
                }
                if (configLabel && dbSvc.headline !== configLabel) {
                    dataToUpdate.headline = configLabel;
                    needsUpdate = true;
                }

                if (needsUpdate) {
                    updates.push(
                        prisma.service.update({
                            where: { id: dbSvc.id },
                            data: dataToUpdate
                        })
                    );
                }
            }
        }

        if (updates.length > 0) {
            await prisma.$transaction(updates);
            console.log(`[sduiSync] Synced ${updates.length} services from ${sourceKey} to DB`);
        }

        // Keep both config tables in sync
        await syncConfigsCrossRelation(sourceKey, config);
    } catch (err) {
        logger.error('[sduiSync] Error syncing UIConfig to DB', { message: err.message, stack: err.stack });
    }
};

/**
 * Ensures that changes made to home_config are mapped to sdui_app_config and vice versa
 */
const syncConfigsCrossRelation = async (sourceKey, configJson) => {
    try {
        if (sourceKey === 'home_config') {
            // Update essentials_grid in sdui_app_config
            const sduiRow = await prisma.uIConfig.findUnique({ where: { key: 'sdui_app_config' } });
            if (sduiRow && sduiRow.configJson) {
                const sConfig = sduiRow.configJson;
                const homeSecs = sConfig.screens?.home?.sections || [];
                const essSect = homeSecs.find(s => s.type === 'essentials_grid' || s.id === 'essentials');
                const sourceEssentials = configJson.sections?.find(s => s.type === 'essentials_grid' || s.id === 'essentials');
                
                if (essSect && sourceEssentials) {
                    const sortedServices = [...(sourceEssentials.services || [])].sort((a, b) => (a.sort_order ?? 999) - (b.sort_order ?? 999));
                    essSect.items = sortedServices.map(s => {
                        // s.icon may be a plain emoji, a bare GCS filename, or a
                        // full URL. Only bare filenames belong under the GCS
                        // images path — emoji (and any other non-URL, non-plain-
                        // filename text) must pass through as-is, or it gets
                        // silently appended onto a GCS URL and 404s on the app
                        // (e.g. ".../images/🛠️").
                        const isLikelyFilename = !!s.icon && /^[\w.-]+\.\w{2,5}$/.test(s.icon);
                        const imageUrl = s.icon?.startsWith('http')
                            ? s.icon
                            : isLikelyFilename
                                ? `https://storage.googleapis.com/ayuxa-assets/mobile/assets/images/${s.icon}`
                                : s.icon;
                        return {
                            id: s.id,
                            label: s.label?.startsWith('{') ? s.label : JSON.stringify({ en: s.label }),
                            route: s.route,
                            visible: s.enabled !== false,
                            icon_key: s.icon ? `ess_${s.id}` : undefined,
                            image_url: imageUrl,
                            sort_order: s.sort_order
                        };
                    });
                    await prisma.uIConfig.update({
                        where: { key: 'sdui_app_config' },
                        data: { configJson: sConfig, version: { increment: 1 } }
                    });
                    console.log('[sduiSync] Synced home_config changes to sdui_app_config');
                }
            }
        } else if (sourceKey === 'sdui_app_config') {
            // Update essentials_grid in home_config
            const homeRow = await prisma.uIConfig.findUnique({ where: { key: 'home_config' } });
            if (homeRow && homeRow.configJson) {
                const hConfig = homeRow.configJson;
                const essSect = hConfig.sections?.find(s => s.type === 'essentials_grid' || s.id === 'essentials');
                const sourceEssentials = configJson.screens?.home?.sections?.find(s => s.type === 'essentials_grid' || s.id === 'essentials');
                
                if (essSect && sourceEssentials) {
                    const sortedItems = [...(sourceEssentials.items || [])].sort((a, b) => (a.sort_order ?? 999) - (b.sort_order ?? 999));
                    essSect.services = sortedItems.map(item => {
                        let labelText = item.label;
                        try {
                            if (labelText.startsWith('{')) {
                                const parsed = JSON.parse(labelText);
                                labelText = parsed.en || Object.values(parsed)[0];
                            }
                        } catch (e) {}
                        
                        return {
                            id: item.id,
                            icon: item.image_url?.split('/').pop() || 'default.png',
                            label: labelText,
                            route: item.route,
                            enabled: item.visible !== false,
                            sort_order: item.sort_order
                        };
                    });
                    await prisma.uIConfig.update({
                        where: { key: 'home_config' },
                        data: { configJson: hConfig, version: { increment: 1 } }
                    });
                    console.log('[sduiSync] Synced sdui_app_config changes to home_config');
                }
            }
        }
    } catch (e) {
        logger.error('[sduiSync] Cross-sync error', { message: e.message });
    }
};

/**
 * Syncs the status of Server-Driven UI Config items based on Database Services.
 * Called when an admin updates/toggles services in the DB.
 */
const syncDbServicesToUIConfig = async () => {
    try {
        const stored = await prisma.uIConfig.findUnique({
            where: { key: 'home_config' },
        });
        
        let config = stored?.configJson;
        if (!config) {
            // Load DEFAULT_HOME_CONFIG dynamically to avoid circular dependencies
            config = require('../controllers/appConfig.controller').DEFAULT_HOME_CONFIG;
        }
        
        if (!config || !config.sections) return;

        const dbServices = await prisma.service.findMany();
        let changed = false;

        // Modules that support admin-created ServiceCategory grouping on the
        // mobile home-screen tile grid — see mobile/app/(tabs)/index.tsx's
        // CATEGORY_GROUPED_MODULES map, which must stay in sync with this list.
        const CATEGORY_GROUPED_SECTIONS = {
            tours_travel: 'TOURS_TRAVEL',
            ayuxa_services: 'DIAGNOSTICS_FITNESS',
            quick_services: 'QUICK_SERVICES',
        };

        for (const section of (config.sections || [])) {
            const isEssentials = section.id === 'essentials' || section.type === 'essentials_grid';
            const categoryGroupedModule = CATEGORY_GROUPED_SECTIONS[section.id];

            if (categoryGroupedModule) {
                // Same auto-add/keep-in-sync logic as the essentials branch
                // below, filtered by category instead of serviceType — this
                // picks up every dynamic service tagged with this module
                // (e.g. Trips & Travels, DIAGNOSTICS_FITNESS dynamic
                // services). A static link-only config item (e.g. "Meetups")
                // has no matching Service row, so it's just carried through
                // untouched by the "keep existing items" loop below (its
                // `dbSvc` lookup finds nothing → no-op).
                //
                // category_id is mirrored onto the config item (in ADDITION
                // to label/route/icon/enabled/sort_order) because the mobile
                // app's category-grouping UI reads it directly off the
                // config item, not off the live DB — grouping would
                // otherwise silently break the moment a service syncs into
                // config, since a plain config item has no category link of
                // its own by default.
                const moduleDbSvcs = dbServices.filter(s => s.category === categoryGroupedModule);
                const updatedServices = [];

                // 1. Sync existing items, keep them if still in DB or static (no DB match)
                for (const item of (section.services || [])) {
                    const dbSvc = moduleDbSvcs.find(s => matchConfigToDb(item.id, item.route, s.slug, s.route));
                    if (dbSvc) {
                        if (!dbSvc.isEnabled && item.enabled) {
                            item.enabled = false;
                            changed = true;
                        }
                        if (item.label !== (dbSvc.headline || dbSvc.name)) {
                            item.label = dbSvc.headline || dbSvc.name;
                            changed = true;
                        }
                        if (item.route !== (dbSvc.route || `/${dbSvc.slug}`)) {
                            item.route = dbSvc.route || `/${dbSvc.slug}`;
                            changed = true;
                        }
                        if (item.icon !== dbSvc.icon) {
                            item.icon = dbSvc.icon;
                            changed = true;
                        }
                        if (item.sort_order !== dbSvc.sortOrder) {
                            item.sort_order = dbSvc.sortOrder;
                            changed = true;
                        }
                        if (item.category_id !== (dbSvc.categoryId || null)) {
                            item.category_id = dbSvc.categoryId || null;
                            changed = true;
                        }
                        updatedServices.push(item);
                    } else {
                        // No matching DB service — either a static entry (e.g.
                        // Meetups) or one that was deleted from DB. We can't
                        // tell those apart here, so keep it: deleting a static
                        // link item would be wrong, and DB-service items are
                        // re-added below anyway if still present.
                        updatedServices.push(item);
                    }
                }

                // 2. Add new DB services that aren't in config yet
                for (const dbSvc of moduleDbSvcs) {
                    const exists = section.services.some(item => matchConfigToDb(item.id, item.route, dbSvc.slug, dbSvc.route));
                    if (!exists) {
                        updatedServices.push({
                            id: dbSvc.slug.replace(/-/g, '_'),
                            label: dbSvc.headline || dbSvc.name,
                            icon: dbSvc.icon || 'default.png',
                            route: dbSvc.route || `/${dbSvc.slug}`,
                            enabled: dbSvc.isEnabled,
                            sort_order: dbSvc.sortOrder || 1,
                            category_id: dbSvc.categoryId || null,
                        });
                        changed = true;
                    }
                }

                updatedServices.sort((a, b) => (a.sort_order ?? 999) - (b.sort_order ?? 999));

                const currentIds = (section.services || []).map(s => `${s.id}:${s.sort_order}`).join(',');
                const newIds = updatedServices.map(s => `${s.id}:${s.sort_order}`).join(',');
                if (currentIds !== newIds) {
                    changed = true;
                }

                section.services = updatedServices;
            } else if (isEssentials) {
                // Trip & Travels keeps serviceType HOME_ESSENTIALS (other
                // code — e.g. mobile/app/(tabs)/index.tsx's essentials grid
                // filter — still keys off it), but its `category` was
                // re-tagged to TOURS_TRAVEL as part of the admin-services
                // restructure (it now has its own admin page + bespoke
                // mobile screen at /trip-travels, reachable from Plans and
                // the new Tours & Travel hub, not from the essentials
                // grid). Excluding it by category here keeps this
                // auto-rebuild from re-adding it into the essentials_grid
                // section it was deliberately pulled out of.
                const homeEssentialDbSvcs = dbServices.filter(s => s.serviceType === 'HOME_ESSENTIALS' && s.slug !== 'home-essentials' && s.category !== 'TOURS_TRAVEL');
                const updatedServices = [];
                
                // 1. Sync existing items, and keep them if they are still in DB
                for (const item of (section.services || [])) {
                    const dbSvc = homeEssentialDbSvcs.find(s => matchConfigToDb(item.id, item.route, s.slug, s.route));
                    if (dbSvc) {
                        // If DB service is disabled, UI item must be disabled.
                        if (!dbSvc.isEnabled && item.enabled) {
                            item.enabled = false;
                            changed = true;
                        }
                        // Keep label, route, icon, and sort_order in sync
                        if (item.label !== (dbSvc.headline || dbSvc.name)) {
                            item.label = dbSvc.headline || dbSvc.name;
                            changed = true;
                        }
                        if (item.route !== (dbSvc.route || `/${dbSvc.slug}`)) {
                            item.route = dbSvc.route || `/${dbSvc.slug}`;
                            changed = true;
                        }
                        if (item.icon !== dbSvc.icon) {
                            item.icon = dbSvc.icon;
                            changed = true;
                        }
                        if (item.sort_order !== dbSvc.sortOrder) {
                            item.sort_order = dbSvc.sortOrder;
                            changed = true;
                        }
                        // Mirrored so mobile's category-grouping UI can read
                        // it directly off the config item — see the
                        // categoryGroupedModule branch above for the same
                        // reasoning; Home Essentials groups on the
                        // home-screen tile grid the same way.
                        if (item.category_id !== (dbSvc.categoryId || null)) {
                            item.category_id = dbSvc.categoryId || null;
                            changed = true;
                        }
                        updatedServices.push(item);
                    } else {
                        // Deleted from DB
                        changed = true;
                    }
                }

                // 2. Add new DB services that aren't in config yet
                for (const dbSvc of homeEssentialDbSvcs) {
                    const exists = section.services.some(item => matchConfigToDb(item.id, item.route, dbSvc.slug, dbSvc.route));
                    if (!exists) {
                        updatedServices.push({
                            id: dbSvc.slug.replace(/-/g, '_'),
                            label: dbSvc.headline || dbSvc.name,
                            icon: dbSvc.icon || 'default.png',
                            route: dbSvc.route || `/${dbSvc.slug}`,
                            enabled: dbSvc.isEnabled,
                            sort_order: dbSvc.sortOrder || 1,
                            category_id: dbSvc.categoryId || null,
                        });
                        changed = true;
                    }
                }

                // Always keep updatedServices sorted by sort_order ascending
                updatedServices.sort((a, b) => (a.sort_order ?? 999) - (b.sort_order ?? 999));
                
                // Check if order changed
                const currentIds = (section.services || []).map(s => `${s.id}:${s.sort_order}`).join(',');
                const newIds = updatedServices.map(s => `${s.id}:${s.sort_order}`).join(',');
                if (currentIds !== newIds) {
                    changed = true;
                }

                section.services = updatedServices;
            } else {
                // For other sections, perform standard enablement status syncing
                for (const item of (section.services || [])) {
                    const dbSvc = dbServices.find(s => matchConfigToDb(item.id, item.route, s.slug, s.route));
                    if (dbSvc) {
                        if (!dbSvc.isEnabled && item.enabled) {
                            item.enabled = false;
                            changed = true;
                        }
                    }
                }
            }
        }

        if (changed) {
            await prisma.uIConfig.upsert({
                where: { key: 'home_config' },
                create: {
                    type: 'CUSTOM',
                    key: 'home_config',
                    label: 'SDUI Home Configuration',
                    configJson: config,
                    sortOrder: 0,
                    isVisible: true,
                    version: 1,
                },
                update: {
                    configJson: config,
                    version: { increment: 1 },
                    publishedAt: new Date(),
                },
            });
            console.log(`[sduiSync] Synced DB services to UIConfig (home_config)`);

            // Also keep sdui_app_config synced
            await syncConfigsCrossRelation('home_config', config);
        }
    } catch (err) {
        logger.error('[sduiSync] Error syncing DB to UIConfig', { message: err.message, stack: err.stack });
    }
};

module.exports = {
    syncUIConfigToDbServices,
    syncDbServicesToUIConfig
};
