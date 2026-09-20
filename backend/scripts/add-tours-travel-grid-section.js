// Adds a proper "Tours & Travel" grid section to home_config, matching the
// pattern already used by "Diagnostics & Fitness" (ayuxa_services,
// type: service_grid) and "Home Essentials" (essentials, type:
// essentials_grid). Today Tours & Travel only exists as a promotional
// custom_card banner ("Ayuxa Can Plan your travel", id: tours_travel) —
// this adds a separate, distinct section (id: tours_travel_grid) alongside
// it rather than replacing it.
//
// Deliberately goes through the REAL updateHomeConfig controller function
// (in-process, not a raw prisma.uIConfig.update) so the optimistic-
// concurrency version check and snapshotBeforeOverwrite safety both still
// apply — a raw write here is exactly the failure mode the code's own
// comments say already wiped out sections once before.
//
// Mobile side: ServiceGrid's CATEGORY_GROUPED_MODULES already maps
// 'tours_travel_grid' -> 'TOURS_TRAVEL' (app/(tabs)/index.tsx), so any
// live Service row with category: TOURS_TRAVEL automatically groups into
// this section too, the same way Diagnostics & Fitness dynamic services do.
//
// Run: node scripts/add-tours-travel-grid-section.js
const prisma = require('../src/config/database');
const { getHomeConfig, updateHomeConfig } = require('../src/controllers/appConfig.controller');

const NEW_SECTION = {
    id: 'tours_travel_grid',
    type: 'service_grid',
    title: 'Tours & Travel',
    enabled: true,
    max_items: 6,
    sort_order: 6,
    // Icons match the live Service rows' current icon exactly (✅/✈️) —
    // syncUIConfigToDbServices() would otherwise overwrite Service.icon to
    // whatever's listed here on publish.
    services: [
        { id: 'trip_travels', icon: '✈️', label: 'Trip & Travels', route: '/trip-travels', enabled: true, sort_order: 1, category_id: null },
        { id: 'meetups', icon: '✅', label: 'Local Meetups', route: '/meetup', enabled: true, sort_order: 2, category_id: null },
    ],
};

function mockRes() {
    const res = {
        statusCode: 200,
        status(code) { this.statusCode = code; return this; },
        set() { return this; },
        json(body) { this.body = body; return this; },
    };
    return res;
}

async function main() {
    // 1. Read the CURRENT live version the same way the admin editor would.
    const row = await prisma.uIConfig.findUnique({ where: { key: 'home_config' } });
    if (!row) { console.log('home_config row not found'); return; }
    const currentVersion = row.version;
    const cfg = row.configJson;

    if ((cfg.sections || []).some(s => s.id === NEW_SECTION.id)) {
        console.log(`Section "${NEW_SECTION.id}" already exists — not adding again.`);
        return;
    }

    const newConfig = { ...cfg, sections: [...(cfg.sections || []), NEW_SECTION] };

    // 2. Publish through the real controller — version check + snapshot +
    // validation all run exactly as they would for a real admin publish.
    const req = { body: { config: newConfig, expectedVersion: currentVersion }, admin: { id: null } };
    const res = mockRes();
    await updateHomeConfig(req, res, (err) => { if (err) throw err; });

    if (res.statusCode >= 400) {
        console.error('Publish rejected:', JSON.stringify(res.body));
        process.exitCode = 1;
        return;
    }
    console.log(`Added "${NEW_SECTION.title}" grid section (id: ${NEW_SECTION.id}). New version:`, res.body?.data?.version ?? '(see DB)');
}

main()
    .catch((e) => { console.error(e); process.exitCode = 1; })
    .finally(() => prisma.$disconnect());
