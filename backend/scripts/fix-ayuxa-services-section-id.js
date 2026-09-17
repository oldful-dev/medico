// One-off repair: the "Diagnostics & Fitness" section in home_config was
// deleted and recreated via Server UI's "Add Grid Service Section", which
// assigns a new auto-generated id (section_<timestamp>) instead of the
// hardcoded "ayuxa_services" id that sduiSync.js's CATEGORY_GROUPED_SECTIONS
// map and mobile's CATEGORY_GROUPED_MODULES lookup depend on. Result: the
// section still renders (mobile also matches by type === 'service_grid'),
// but new DIAGNOSTICS_FITNESS services never auto-sync into it, because the
// backend sync only recognizes it by that exact id.
//
// This restores the section's id to "ayuxa_services" so:
//   1. syncDbServicesToUIConfig() picks it up again on the next service
//      create/update/delete and backfills any DIAGNOSTICS_FITNESS services
//      created while the id was wrong (e.g. "Doctor Visit").
//   2. Mobile's serviceGridSection lookup (which also checks
//      sec.id === 'ayuxa_services') keeps matching it even if `type` ever
//      changes.
//
// Run: node scripts/fix-ayuxa-services-section-id.js
const prisma = require('../src/config/database');
const { syncDbServicesToUIConfig } = require('../src/utils/sduiSync');

async function main() {
    const stored = await prisma.uIConfig.findUnique({ where: { key: 'home_config' } });
    if (!stored?.configJson) {
        console.log('No home_config.configJson found — nothing to fix.');
        return;
    }

    const config = stored.configJson;
    const section = config.sections?.find(
        (s) => s.type === 'service_grid' && s.id !== 'ayuxa_services' && s.id !== 'tours_travel'
    );

    if (!section) {
        console.log('No mismatched service_grid section found — nothing to fix.');
        return;
    }

    console.log(`Found section "${section.title}" with id "${section.id}" — renaming to "ayuxa_services".`);
    section.id = 'ayuxa_services';

    await prisma.uIConfig.update({
        where: { key: 'home_config' },
        data: { configJson: config },
    });

    console.log('Section id fixed. Running sync to backfill any missed services...');
    await syncDbServicesToUIConfig();
    console.log('Done.');
}

main()
    .catch((e) => {
        console.error(e);
        process.exitCode = 1;
    })
    .finally(() => prisma.$disconnect());
