/**
 * Migration Script: Normalize all asset URLs in the database
 *
 * Replaces:
 *   - https://storage.googleapis.com/oldful-assets/...  → https://assets.oldful.com/...
 *   - https://pub-bedeea30b7b14e2bb224501a5e1260c8.r2.dev/...  → https://assets.oldful.com/...
 *   - Any other R2 / GCS direct URLs
 *
 * Usage:
 *   node scripts/migrate-asset-urls.js           (dry run — shows what would change)
 *   node scripts/migrate-asset-urls.js --execute  (actually updates the database)
 *
 * ⚠️  Always run dry-run first to inspect changes before executing.
 */

require('dotenv').config();
const prisma = require('../src/config/database');
const { logger } = require('../src/config/logger');

const CDN_BASE = 'https://assets.oldful.com';

// Patterns to replace — order matters (most specific first)
const URL_PATTERNS = [
    { find: 'https://pub-bedeea30b7b14e2bb224501a5e1260c8.r2.dev/', replace: `${CDN_BASE}/` },
    { find: 'https://storage.googleapis.com/oldful-assets/', replace: `${CDN_BASE}/` },
];

// Tables and columns that may contain asset URLs
const TARGETS = [
    { model: 'user', fields: ['profileImageUrl'] },
    { model: 'service', fields: ['icon', 'bannerImage'] },
    { model: 'city', fields: ['imageUrl'] },
    { model: 'booking', fields: ['attachments'] },
    { model: 'invoice', fields: ['pdfUrl'] },
    { model: 'media', fields: ['url', 'thumbnailUrl', 'gcsUrl'] },
    { model: 'banner', fields: ['imageUrl'] },
];

const replaceUrl = (url) => {
    if (!url || typeof url !== 'string') return url;
    let result = url;
    for (const pattern of URL_PATTERNS) {
        if (result.includes(pattern.find)) {
            result = result.replace(pattern.find, pattern.replace);
        }
    }
    return result;
};

const isDryRun = !process.argv.includes('--execute');

async function migrate() {
    console.log(`\n=== Asset URL Migration ${isDryRun ? '(DRY RUN)' : '🔴 EXECUTING'} ===\n`);

    let totalFound = 0;
    let totalUpdated = 0;

    for (const target of TARGETS) {
        const { model, fields } = target;

        // Check if the model exists in Prisma
        if (!prisma[model]) {
            console.log(`⚠️  Model "${model}" not found in Prisma schema, skipping.`);
            continue;
        }

        try {
            const records = await prisma[model].findMany({
                select: { id: true, ...Object.fromEntries(fields.map(f => [f, true])) },
            });

            for (const record of records) {
                const updates = {};
                let changed = false;

                for (const field of fields) {
                    const oldValue = record[field];
                    if (!oldValue) continue;

                    // Handle arrays (e.g., attachments stored as JSON arrays)
                    if (Array.isArray(oldValue)) {
                        const newArr = oldValue.map(replaceUrl);
                        if (JSON.stringify(newArr) !== JSON.stringify(oldValue)) {
                            updates[field] = newArr;
                            changed = true;
                        }
                    } else if (typeof oldValue === 'string') {
                        const newValue = replaceUrl(oldValue);
                        if (newValue !== oldValue) {
                            updates[field] = newValue;
                            changed = true;
                            console.log(`  ${model}.${field}: ${oldValue}`);
                            console.log(`  → ${newValue}\n`);
                        }
                    }
                }

                if (changed) {
                    totalFound++;
                    if (!isDryRun) {
                        await prisma[model].update({ where: { id: record.id }, data: updates });
                        totalUpdated++;
                    }
                }
            }
        } catch (err) {
            console.log(`⚠️  Error scanning "${model}": ${err.message}`);
        }
    }

    console.log(`\n=== Summary ===`);
    console.log(`URLs found requiring update: ${totalFound}`);
    if (isDryRun) {
        console.log(`Mode: DRY RUN — no changes made.`);
        console.log(`Run with --execute to apply changes.`);
    } else {
        console.log(`URLs updated: ${totalUpdated}`);
    }

    await prisma.$disconnect();
}

migrate().catch(err => {
    console.error('Migration failed:', err);
    process.exit(1);
});
