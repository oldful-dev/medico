#!/usr/bin/env node
// ──────────────────────────────────────────────────────────────────────────────
//  Admin Banner CLI — Manage banners from command line
//  Usage: node admin-banner-cli.js [command] [args]
//
//  Commands:
//    list                          List all banners
//    get <id>                      Get banner by ID
//    create <imageUrl> <heading> <subheading> [ctaText] [ctaRoute] [order]
//    update <id> [field=value...]  Update banner fields
//    delete <id>                   Delete banner
//    toggle <id> <true|false>      Toggle active status
//    reorder <json>                Reorder banners (JSON array)
//    home                          Get home banners (public)
//
//  Example:
//    node admin-banner-cli.js create "https://example.com/img.jpg" "Travel" "Plan your trip"
//    node admin-banner-cli.js update banner_01 heading="New Title" order=1
//    node admin-banner-cli.js list
//    node admin-banner-cli.js home
// ──────────────────────────────────────────────────────────────────────────────

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const command = process.argv[2];

async function main() {
  try {
    switch (command) {
      case 'list':
        await listBanners();
        break;
      case 'get':
        await getBanner(process.argv[3]);
        break;
      case 'create':
        await createBanner(
          process.argv[3],
          process.argv[4],
          process.argv[5],
          process.argv[6],
          process.argv[7],
          process.argv[8]
        );
        break;
      case 'update':
        await updateBanner(process.argv[3], process.argv.slice(4));
        break;
      case 'delete':
        await deleteBanner(process.argv[3]);
        break;
      case 'toggle':
        await toggleBanner(process.argv[3], process.argv[4] === 'true');
        break;
      case 'reorder':
        await reorderBanners(JSON.parse(process.argv[3]));
        break;
      case 'home':
        await getHomeBanners();
        break;
      default:
        console.log(`
📋 Admin Banner CLI

Usage: node admin-banner-cli.js [command] [args]

Commands:
  list                            List all banners
  home                            Get active banners (home screen)
  get <id>                        Get banner by ID
  create <url> <heading> <sub> [cta] [route] [order]
                                  Create new banner
  update <id> field=value...      Update banner
  delete <id>                     Delete banner
  toggle <id> true|false          Toggle active status
  reorder <json>                  Reorder banners

Examples:
  node admin-banner-cli.js home
  node admin-banner-cli.js list
  node admin-banner-cli.js create "https://example.com/img.jpg" "Title" "Subtitle"
  node admin-banner-cli.js update banner_01 heading="New Title" order=2
  node admin-banner-cli.js delete banner_01
  node admin-banner-cli.js toggle banner_01 false
        `);
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

async function listBanners() {
  const banners = await prisma.banner.findMany({
    orderBy: { order: 'asc' },
  });
  console.log('\n📋 All Banners:\n');
  banners.forEach((b) => {
    console.log(`  ID: ${b.id}`);
    console.log(`  Heading: ${b.heading}`);
    console.log(`  Subheading: ${b.subheading}`);
    console.log(`  CTA: ${b.ctaText || 'N/A'} → ${b.ctaRoute || 'N/A'}`);
    console.log(`  Order: ${b.order}, Active: ${b.isActive}`);
    console.log(`  Image: ${b.imageUrl.substring(0, 60)}...`);
    console.log('');
  });
  console.log(`Total: ${banners.length} banners\n`);
}

async function getHomeBanners() {
  const banners = await prisma.banner.findMany({
    where: { isActive: true },
    orderBy: { order: 'asc' },
  });
  console.log('\n🏠 Home Screen Banners (Active):\n');
  banners.forEach((b, i) => {
    console.log(`  ${i + 1}. ${b.heading}`);
    console.log(`     ${b.subheading}`);
    if (b.ctaText) console.log(`     Button: "${b.ctaText}" → ${b.ctaRoute}`);
    console.log('');
  });
  console.log(`Total: ${banners.length} active banners\n`);
}

async function getBanner(id) {
  const banner = await prisma.banner.findUnique({ where: { id } });
  if (!banner) {
    console.log(`❌ Banner not found: ${id}`);
    return;
  }
  console.log('\n📌 Banner Details:\n');
  console.log(JSON.stringify(banner, null, 2));
  console.log('');
}

async function createBanner(imageUrl, heading, subheading, ctaText, ctaRoute, order) {
  if (!imageUrl || !heading || !subheading) {
    console.log('❌ Required: imageUrl, heading, subheading');
    return;
  }
  const banner = await prisma.banner.create({
    data: {
      imageUrl,
      heading,
      subheading,
      ctaText: ctaText || null,
      ctaRoute: ctaRoute || null,
      order: order ? parseInt(order) : 0,
      isActive: true,
    },
  });
  console.log('\n✅ Banner created:\n');
  console.log(JSON.stringify(banner, null, 2));
  console.log('');
}

async function updateBanner(id, args) {
  if (!id || args.length === 0) {
    console.log('❌ Usage: update <id> field=value field=value...');
    return;
  }
  const data = {};
  args.forEach((arg) => {
    const [key, value] = arg.split('=');
    if (key === 'order') {
      data[key] = parseInt(value);
    } else if (key === 'isActive') {
      data[key] = value === 'true';
    } else {
      data[key] = value;
    }
  });
  const banner = await prisma.banner.update({
    where: { id },
    data,
  });
  console.log('\n✅ Banner updated:\n');
  console.log(JSON.stringify(banner, null, 2));
  console.log('');
}

async function deleteBanner(id) {
  if (!id) {
    console.log('❌ Usage: delete <id>');
    return;
  }
  await prisma.banner.delete({ where: { id } });
  console.log(`\n✅ Banner deleted: ${id}\n`);
}

async function toggleBanner(id, isActive) {
  if (!id) {
    console.log('❌ Usage: toggle <id> true|false');
    return;
  }
  const banner = await prisma.banner.update({
    where: { id },
    data: { isActive },
  });
  console.log('\n✅ Banner toggled:\n');
  console.log(JSON.stringify(banner, null, 2));
  console.log('');
}

async function reorderBanners(banners) {
  if (!Array.isArray(banners)) {
    console.log('❌ Usage: reorder \'[{"id":"banner_01","order":1}]\'');
    return;
  }
  await Promise.all(
    banners.map(({ id, order }) =>
      prisma.banner.update({ where: { id }, data: { order } })
    )
  );
  console.log('\n✅ Banners reordered\n');
}

main();
