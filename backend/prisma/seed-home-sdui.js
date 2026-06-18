// ──────────────────────────────────────────────
//  Seed Home Screen SDUI Config
//  Run: node backend/prisma/seed-home-sdui.js
//  Upserts the UIConfig record for sdui_app_config
//  so the mobile app receives it from GET /api/app-config
// ──────────────────────────────────────────────

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Import the DEFAULT_CONFIG and DEFAULT_HOME_CONFIG from the controller
const { DEFAULT_CONFIG, DEFAULT_HOME_CONFIG } = require('../src/controllers/appConfig.controller');

async function main() {
  console.log('🌱 Seeding Home Screen SDUI config...\n');

  await prisma.uIConfig.upsert({
    where: { key: 'sdui_app_config' },
    create: {
      type: 'CUSTOM',
      key: 'sdui_app_config',
      label: 'SDUI App Configuration',
      configJson: DEFAULT_CONFIG,
      sortOrder: 0,
      isVisible: true,
      version: 1,
    },
    update: {
      configJson: DEFAULT_CONFIG,
      version: { increment: 1 },
      publishedAt: new Date(),
    },
  });

  console.log('  ✅ sdui_app_config upserted');

  await prisma.uIConfig.upsert({
    where: { key: 'home_config' },
    create: {
      type: 'CUSTOM',
      key: 'home_config',
      label: 'SDUI Home Configuration',
      configJson: DEFAULT_HOME_CONFIG,
      sortOrder: 0,
      isVisible: true,
      version: 1,
    },
    update: {
      configJson: DEFAULT_HOME_CONFIG,
      version: { increment: 1 },
      publishedAt: new Date(),
    },
  });

  console.log('  ✅ home_config upserted');
  console.log(`     version: ${DEFAULT_CONFIG.version}`);
  console.log(`     home sections: ${DEFAULT_CONFIG.screens.home.sections.length}`);
  console.log(`     essentials max_visible_rows: ${DEFAULT_CONFIG.screens.home.sections.find(s => s.id === 'essentials')?.config?.max_visible_rows ?? 'none'}`);
  console.log('\n🎉 Done!');
}

main()
  .catch((e) => {
    console.error('❌ Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
