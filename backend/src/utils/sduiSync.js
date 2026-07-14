const prisma = require('../config/database');

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
const syncUIConfigToDbServices = async (config) => {
    if (!config || !config.sections) return;
    try {
        const dbServices = await prisma.service.findMany();
        const updates = [];

        for (const dbSvc of dbServices) {
            let foundInConfig = false;
            let configIsEnabled = false;
            let configIcon = null;
            let configLabel = null;

            for (const section of (config.sections || [])) {
                for (const item of (section.services || [])) {
                    if (matchConfigToDb(item.id, item.route, dbSvc.slug, dbSvc.route)) {
                        foundInConfig = true;
                        if (item.enabled) {
                            configIsEnabled = true;
                        }
                        if (item.icon) {
                            configIcon = item.icon;
                        }
                        if (item.label) {
                            configLabel = item.label;
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
            console.log(`[sduiSync] Synced ${updates.length} services (enabled/icon/label) from UIConfig to DB`);
        }
    } catch (err) {
        console.error('[sduiSync] Error syncing UIConfig to DB:', err);
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

        for (const section of (config.sections || [])) {
            const isEssentials = section.id === 'essentials' || section.type === 'essentials_grid';
            
            if (isEssentials) {
                const homeEssentialDbSvcs = dbServices.filter(s => s.serviceType === 'HOME_ESSENTIALS' && s.slug !== 'home-essentials');
                const updatedServices = [];
                
                // 1. Sync existing items, and keep them if they are still in DB
                for (const item of (section.services || [])) {
                    const dbSvc = homeEssentialDbSvcs.find(s => matchConfigToDb(item.id, item.route, s.slug, s.route));
                    if (dbSvc) {
                        if (item.enabled !== dbSvc.isEnabled) {
                            item.enabled = dbSvc.isEnabled;
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
                            sort_order: dbSvc.sortOrder || 1
                        });
                        changed = true;
                    }
                }
                section.services = updatedServices;
            } else {
                // For other sections, perform standard enablement status syncing
                for (const item of (section.services || [])) {
                    const dbSvc = dbServices.find(s => matchConfigToDb(item.id, item.route, s.slug, s.route));
                    if (dbSvc) {
                        if (item.enabled !== dbSvc.isEnabled) {
                            item.enabled = dbSvc.isEnabled;
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
            console.log(`[sduiSync] Synced DB services to UIConfig`);
        }
    } catch (err) {
        console.error('[sduiSync] Error syncing DB to UIConfig:', err);
    }
};

module.exports = {
    syncUIConfigToDbServices,
    syncDbServicesToUIConfig
};
