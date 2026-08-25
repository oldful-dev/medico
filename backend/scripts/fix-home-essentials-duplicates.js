// One-off repair: UIConfig.home_config's essentials.services array had 14
// entries for what should be 11 real Home Essentials services — 3 services
// (AC & Appliance Repair, Plumbing & Electrical, Deep Cleaning & Pest Control)
// were each duplicated under two different ids (legacy id + newer id), most
// likely from a raw-JSON-editor save that added new-style ids without
// removing the old ones. Because max_items=8 slices the array in original
// order, this pushed 3 real services (Bank Paperwork, Paperwork & Legal,
// Trip & Travels) off the visible Home screen grid entirely, and showed
// duplicate tiles for the other 3.
//
// This rebuilds essentials.services (home_config) and essentials.items
// (sdui_app_config) directly from the live Service table — the confirmed
// clean, canonical 11-service set also used by /home-essentials — replacing
// the corrupted arrays wholesale rather than trying to patch out individual
// duplicates.

const prisma = require('../src/config/database');

(async () => {
    const services = await prisma.service.findMany({
        where: { serviceType: 'HOME_ESSENTIALS', slug: { not: 'home-essentials' } },
        orderBy: { sortOrder: 'asc' },
    });
    console.log(`Found ${services.length} canonical Home Essentials services.`);

    // ── home_config ──────────────────────────────────────────────────────
    const homeRow = await prisma.uIConfig.findUnique({ where: { key: 'home_config' } });
    const homeConfig = homeRow.configJson;
    const essSection = homeConfig.sections.find(s => s.id === 'essentials' || s.type === 'essentials_grid');
    if (!essSection) throw new Error('essentials section not found in home_config');

    const before = essSection.services.length;
    essSection.services = services.map(svc => ({
        id: svc.slug.replace(/-/g, '_'),
        icon: svc.icon || '',
        label: svc.name,
        route: svc.route || `/${svc.slug}`,
        enabled: svc.isEnabled,
        sort_order: svc.sortOrder,
    }));
    console.log(`home_config: ${before} -> ${essSection.services.length} entries`);

    await prisma.uIConfig.update({
        where: { key: 'home_config' },
        data: { configJson: homeConfig, version: { increment: 1 } },
    });

    // ── sdui_app_config ──────────────────────────────────────────────────
    const sduiRow = await prisma.uIConfig.findUnique({ where: { key: 'sdui_app_config' } });
    const sduiConfig = sduiRow.configJson;
    const sduiEssSection = sduiConfig.screens.home.sections.find(s => s.id === 'essentials' || s.type === 'essentials_grid');
    if (!sduiEssSection) throw new Error('essentials section not found in sdui_app_config');

    const sduiBefore = sduiEssSection.items.length;
    sduiEssSection.items = services.map(svc => {
        const icon = svc.icon || '';
        const isLikelyFilename = !!icon && /^[\w.-]+\.\w{2,5}$/.test(icon);
        const imageUrl = icon.startsWith('http')
            ? icon
            : isLikelyFilename
                ? `https://storage.googleapis.com/ayuxa-assets/mobile/assets/images/${icon}`
                : icon; // plain emoji passes through as-is — no GCS path corruption
        return {
            id: svc.slug.replace(/-/g, '_'),
            label: JSON.stringify({ en: svc.name }),
            route: svc.route || `/${svc.slug}`,
            visible: svc.isEnabled,
            icon_key: icon ? `ess_${svc.slug.replace(/-/g, '_')}` : undefined,
            image_url: imageUrl,
            sort_order: svc.sortOrder,
        };
    });
    console.log(`sdui_app_config: ${sduiBefore} -> ${sduiEssSection.items.length} entries`);

    await prisma.uIConfig.update({
        where: { key: 'sdui_app_config' },
        data: { configJson: sduiConfig, version: { increment: 1 } },
    });

    console.log('Done.');
    process.exit(0);
})().catch(e => { console.error('FAILED:', e); process.exit(1); });
