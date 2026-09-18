// One-off repair for production home_config, which was found badly broken:
//   1. Both existing sections (Quick Services, Diagnostics & Fitness) had
//      their real ids replaced with random section_<timestamp> ids at some
//      point (deleted + re-added via Server UI's "Add Grid Service
//      Section" instead of the "Restore" button) — breaking backend
//      auto-sync for new services into them.
//   2. EVERY item across both sections shared the exact same id
//      ("nurse_care") — a real React duplicate-key bug, not just a cache
//      issue. Each item now gets a unique, descriptive id.
//   3. The essentials (Home Essentials) and tours_travel (Tours & Travel)
//      sections were missing from the config entirely — meaning those
//      home-screen grids likely weren't rendering on the live app at all.
//      Restored from the same default shape used to seed a fresh config
//      (see appConfig.controller.js's DEFAULT_HOME_CONFIG).
//   4. The 5 Diagnostics & Fitness tiles (Blood Work, Scan & ECG, Medicine,
//      Fitness, Physio) had no backing Service row, so they never showed
//      on /diagnostic-fitness — creates real Service rows for each,
//      category DIAGNOSTICS_FITNESS, isDynamic: false (Core Built-in Page,
//      since these route to real existing native screens).
//
// Existing custom content (admin's actual labels/icons/routes for Quick
// Services and Diagnostics & Fitness) is preserved — only identity fields
// (section id, item id) are corrected.
//
// Run: node scripts/repair-production-home-config.js
const prisma = require('../src/config/database');
const { syncDbServicesToUIConfig } = require('../src/utils/sduiSync');

const NEW_DIAGNOSTIC_SERVICES = [
    { name: 'Blood Work', slug: 'blood-work', route: '/blood-test', sortOrder: 1 },
    { name: 'Scan & ECG', slug: 'scan-ecg-diag', route: '/scan-ecg', sortOrder: 2 },
    { name: 'Medicine', slug: 'order-medicine-diag', route: '/order-medicines', sortOrder: 3 },
    { name: 'Fitness', slug: 'fitness-diag', route: '/fitness', sortOrder: 4 },
    { name: 'Physio', slug: 'physio-diag', route: '/physio', sortOrder: 5 },
];

const ESSENTIALS_SECTION = {
    id: 'essentials',
    title: 'Home Essentials Services',
    type: 'essentials_grid',
    enabled: true,
    sort_order: 3,
    max_items: 8,
    view_all_route: '/all-home-essentials',
    services: [
        { id: 'bills', label: 'Bill\nPayment', icon: '056ecb9c01dd2283b1c0db1e84c1eb94c6d8a45a.png', route: '/bill-payment', enabled: true, sort_order: 1 },
        { id: 'tech_helper', label: 'Tech\nHelp', icon: 'fa6360cf6179cebaed29a6c808bafae2d31ad753.png', route: '/paper-legal', enabled: true, sort_order: 2 },
        { id: 'bank', label: 'Paper-\nwork', icon: '33ede0e57be708b9775957c3ecec7013b0a56c6d.png', route: '/bank-paperwork', enabled: true, sort_order: 3 },
        { id: 'cleaning', label: 'Deep Cleaning\n& Pest Ctrl', icon: 'ad6b9b061bc7b1487a0e73c2557f711136d2a4d9.png', route: '/deep-cleaning', enabled: true, sort_order: 5 },
        { id: 'sanitisation', label: 'Washroom\nSanitation', icon: '8888c71f466119aa294bd00136ff887f616d4737.png', route: '/sanitisation', enabled: true, sort_order: 6 },
        { id: 'plumbing', label: 'Plumbing &\nElectrician', icon: '8ce612b04a3a83f1e834c7b71a6dd2c0174cb918.png', route: '/plumbing-electrical', enabled: true, sort_order: 7 },
        { id: 'driver', label: 'Driver\nRequest', icon: '60d4d0afa5801aeaa9e593bc049e3b017ef5624c.png', route: '/driving-cab', enabled: true, sort_order: 8 },
    ],
};

const TOURS_TRAVEL_SECTION = {
    id: 'tours_travel',
    title: 'Tours & Travel',
    type: 'service_grid',
    enabled: true,
    sort_order: 4,
    services: [
        { id: 'meetups', label: 'Local\nMeetups', icon: '🧑‍🤝‍🧑', route: '/meetup', enabled: true, sort_order: 1 },
    ],
};

async function main() {
    const stored = await prisma.uIConfig.findUnique({ where: { key: 'home_config' } });
    if (!stored?.configJson) {
        console.log('No home_config found — nothing to repair.');
        return;
    }
    const config = stored.configJson;

    // 1 & 2: fix section ids and de-duplicate item ids for the two existing sections.
    for (const section of config.sections || []) {
        if (section.type === 'quick_services' && section.id !== 'quick_services') {
            console.log(`Fixing section id "${section.id}" -> "quick_services"`);
            section.id = 'quick_services';
        }
        if (section.type === 'service_grid' && section.title?.includes('Diagnostic') && section.id !== 'ayuxa_services') {
            console.log(`Fixing section id "${section.id}" -> "ayuxa_services"`);
            section.id = 'ayuxa_services';
        }
        (section.services || []).forEach((item, idx) => {
            const uniqueId = `${section.id}_item_${idx + 1}`;
            if (item.id === 'nurse_care' || !item.id) {
                console.log(`  Fixing duplicate/missing item id in "${section.id}": "${item.label}" -> "${uniqueId}"`);
                item.id = uniqueId;
            }
        });
    }

    // 3: restore missing essentials / tours_travel sections.
    const hasEssentials = (config.sections || []).some(s => s.id === 'essentials');
    const hasToursTravel = (config.sections || []).some(s => s.id === 'tours_travel');
    if (!hasEssentials) {
        console.log('Restoring missing "essentials" section.');
        config.sections.push(ESSENTIALS_SECTION);
    }
    if (!hasToursTravel) {
        console.log('Restoring missing "tours_travel" section.');
        config.sections.push(TOURS_TRAVEL_SECTION);
    }

    await prisma.uIConfig.update({
        where: { key: 'home_config' },
        data: { configJson: config, version: { increment: 1 } },
    });
    console.log('home_config repaired.');

    // 4: create real Service rows for the 5 Diagnostics & Fitness tiles.
    for (const svc of NEW_DIAGNOSTIC_SERVICES) {
        const existing = await prisma.service.findUnique({ where: { slug: svc.slug } });
        if (existing) {
            console.log(`Service "${svc.slug}" already exists — skipping.`);
            continue;
        }
        await prisma.service.create({
            data: {
                name: svc.name,
                slug: svc.slug,
                icon: '🩺',
                route: svc.route,
                headline: svc.name,
                subhead: svc.name,
                sortOrder: svc.sortOrder,
                isEnabled: true,
                isDynamic: false,
                category: 'DIAGNOSTICS_FITNESS',
                serviceType: 'OTHER',
                paymentMode: 'INQUIRY',
                basePrice: 0,
            },
        });
        console.log(`Created Service row for "${svc.name}" (${svc.slug}).`);
    }

    console.log('Running sync...');
    await syncDbServicesToUIConfig();
    console.log('Done.');
}

main()
    .catch((e) => {
        console.error(e);
        process.exitCode = 1;
    })
    .finally(() => prisma.$disconnect());
