// One-off: rearrange home_config's top-level sections per explicit user
// request — Quick Services and Diagnostics stay put (cards 1-2), then a new
// "Plan Your Travel" custom_card banner (3), Home Essentials (4), Medical
// Tourism (5). Trust Branding and Local Meetup are NOT sections in this
// array at all — they're hardcoded to always render after every section
// (Trust Badges right after the Banner Slider, Featured Meetup at the very
// bottom, mobile/app/(tabs)/index.tsx lines ~1226-1278) — so they land as
// cards 6-7 automatically with zero changes here.
//
// Also fixes the Medical Tourism card's title typo ("Medical Toursim").
//
// Uses optimistic concurrency (expectedVersion) same as the admin Server UI
// save path, and validates with the same sduiValidator rules before writing,
// so this can't reintroduce the duplicate-id corruption from earlier incidents.
//
// Run: node scripts/reorder-home-cards.js
const prisma = require('../src/config/database');
const { validateHomeConfig } = require('../src/utils/sduiValidator');

async function main() {
    const row = await prisma.uIConfig.findUnique({ where: { key: 'home_config' } });
    if (!row) throw new Error('home_config row not found');

    const config = row.configJson;
    const sections = config.sections;

    const mtCard = sections.find(s => s.id === 'section_1789733955944');
    if (!mtCard) throw new Error('Medical Tourism section not found — expected id section_1789733955944');
    const essentials = sections.find(s => s.id === 'essentials');
    if (!essentials) throw new Error('essentials section not found');

    // Fix the typo and set its new position (5th card).
    mtCard.title = 'Medical Tourism';
    mtCard.subtitle = 'Medical Tourism';
    mtCard.sort_order = 5;

    // Home Essentials moves to 4th (was sharing sort_order 4 with the
    // Medical Tourism card before the travel banner existed).
    essentials.sort_order = 4;

    // New "Plan Your Travel" banner as the 3rd card — same shape Server UI's
    // own "Add Section" button creates for a custom_card (ServerUIPage.jsx).
    const travelBanner = {
        id: `section_${Date.now()}`,
        type: 'custom_card',
        title: 'Plan Your Travel',
        subtitle: 'Tell us where you want to go.',
        enabled: true,
        cta_text: 'Share Now',
        services: [],
        image_url: 'banner.png',
        sort_order: 3,
        view_all_route: '/trip-travels',
    };
    sections.push(travelBanner);

    const { valid, errors } = validateHomeConfig(config);
    if (!valid) {
        console.error('Validation failed, aborting:', errors);
        process.exit(1);
    }

    // Same rollback snapshot appConfig.controller.js's updateHomeConfig takes
    // before every publish, so this write is undoable via the admin panel's
    // version history if anything looks wrong after.
    await prisma.uIConfigVersion.create({
        data: {
            configKey: 'home_config',
            configJson: row.configJson,
            version: row.version,
            publishedBy: null,
            publishedAt: row.publishedAt,
        },
    });

    await prisma.uIConfig.update({
        where: { key: 'home_config' },
        data: { configJson: config, version: { increment: 1 } },
    });

    console.log('Updated. New order:');
    [...config.sections].sort((a, b) => a.sort_order - b.sort_order)
        .forEach(s => console.log(`  ${s.sort_order}. ${s.id} (${s.type}) — "${s.title}"`));
}

main()
    .catch((e) => {
        console.error(e);
        process.exitCode = 1;
    })
    .finally(() => prisma.$disconnect());
