// One-off: adds the new "Tours & Travel" home-screen section to the LIVE
// home_config UIConfig row (the row /app-config/home actually serves to
// devices — editing only the DEFAULT_HOME_CONFIG/HOME_CONFIG_FALLBACK
// constants in code has no effect until this row is touched). Part of the
// admin-services-restructure follow-up giving Tours & Travel a real
// customer-facing home. Mirrors the section shape added to
// appConfig.controller.js's DEFAULT_HOME_CONFIG and
// sduiService.ts's HOME_CONFIG_FALLBACK. Idempotent — skips if the section
// already exists (id: 'tours_travel').
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const TOURS_TRAVEL_SECTION = {
  // Static "Meetups" link only — Trips & Travels and any future dynamic
  // Tours & Travel service (category=TOURS_TRAVEL) are auto-added here by
  // sduiSync.js's isToursTravel branch on the next sync run.
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
  const row = await prisma.uIConfig.findUnique({ where: { key: 'home_config' } });
  if (!row || !row.configJson) {
    console.log('No home_config row found — nothing to update (app will use DEFAULT_HOME_CONFIG which already includes the new section).');
    return;
  }

  const config = row.configJson;
  config.sections = config.sections || [];

  const exists = config.sections.some(s => s.id === 'tours_travel');
  if (exists) {
    console.log('tours_travel section already present in home_config — no changes made.');
    return;
  }

  config.sections.push(TOURS_TRAVEL_SECTION);

  const updated = await prisma.uIConfig.update({
    where: { key: 'home_config' },
    data: {
      configJson: config,
      version: { increment: 1 },
      publishedAt: new Date(),
    },
  });

  console.log(`home_config updated — new version: ${updated.version}`);
  console.log('sections now:', updated.configJson.sections.map(s => ({ id: s.id, sort_order: s.sort_order })));
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
