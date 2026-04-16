/**
 * ══════════════════════════════════════════════════════════════════════════════
 *  STORAGE MIGRATION SCRIPT — "BEAUTIFUL GCS"
 * ══════════════════════════════════════════════════════════════════════════════
 * 
 * Objectives:
 * 1. Move existing files from flat folders to hierarchical /users/{id}/... folders.
 * 2. Update Database (PostgreSQL) to point to new GCS paths and CDN URLs.
 * 3. Support Dry-Run mode for safety.
 * 
 * Usage:
 * # Run Dry Run (No changes)
 * node scripts/storage-migration.js
 * 
 * # Run Actual Migration (DANGER: Permanent)
 * node scripts/storage-migration.js --commit
 * ══════════════════════════════════════════════════════════════════════════════
 */

require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const { Storage } = require('@google-cloud/storage');
const path = require('path');

const prisma = new PrismaClient();
const storage = new Storage({ keyFilename: process.env.FIREBASE_SERVICE_ACCOUNT_PATH });
const bucket = storage.bucket(process.env.GOOGLE_STORAGE_BUCKET_NAME);

const IS_DRY_RUN = !process.argv.includes('--commit');

/**
 * Derives storage path from full URL
 */
const getStoragePathFromUrl = (url) => {
    if (!url) return null;
    
    // Strip query parameters (signed URL parts)
    const cleanUrl = url.split('?')[0];

    const cdnBase = (process.env.ASSETS_CDN_URL || '').replace(/\/+$/, '');
    const gcsBase = `https://storage.googleapis.com/${process.env.GOOGLE_STORAGE_BUCKET_NAME}/`;

    if (cdnBase && cleanUrl.startsWith(cdnBase)) {
        return cleanUrl.replace(`${cdnBase}/`, '').replace(/^\/+/, '');
    }
    if (cleanUrl.startsWith(gcsBase)) {
        return cleanUrl.replace(gcsBase, '').replace(/^\/+/, '');
    }
    return null;
};

/**
 * Builds new URL based on storage path
 */
const toCDNUrl = (storagePath) => {
    const cdnBase = (process.env.ASSETS_CDN_URL || '').replace(/\/+$/, '');
    return `${cdnBase}/${storagePath}`;
};

/**
 * Migration Logic
 */
async function migrate() {
    console.log(`\n🚀 Starting Storage Migration [${IS_DRY_RUN ? 'DRY RUN' : 'COMMIT MODE'}]`);
    console.log(`----------------------------------------------------------------------`);

    if (IS_DRY_RUN) {
        console.log("⚠️  Running in DRY RUN mode. No files will be moved or DB records updated.");
        console.log("⚠️  Run with --commit to apply changes.\n");
    }

    // ─── Phase 1: User Avatars ──────────────────────────────────
    console.log("📂 Phase 1: Migrating User Avatars...");
    const users = await prisma.user.findMany({
        where: {
            profileImageUrl: { startsWith: 'http' },
            NOT: { profileImageUrl: { contains: '/profile/avatar' } }
        },
        select: { id: true, profileImageUrl: true }
    });

    for (const user of users) {
        const oldPath = getStoragePathFromUrl(user.profileImageUrl);
        if (!oldPath || oldPath.startsWith('users/')) continue;

        const ext = path.extname(oldPath);
        const newPath = `users/${user.id}/profile/avatar${ext}`;
        const newUrl = toCDNUrl(newPath);

        console.log(`   [User Avatar] ID: ${user.id} | ${oldPath} -> ${newPath}`);

        if (!IS_DRY_RUN) {
            try {
                await bucket.file(oldPath).move(newPath);
                await prisma.user.update({
                    where: { id: user.id },
                    data: { profileImageUrl: newUrl }
                });
            } catch (err) {
                console.error(`   ❌ Failed to move user avatar ${user.id}:`, err.message);
            }
        }
    }

    // ─── Phase 2: Health Reports ────────────────────────────────
    console.log("\n📂 Phase 2: Migrating Health Reports...");
    const reports = await prisma.healthReport.findMany({
        where: {
            fileUrl: { startsWith: 'http' },
            NOT: { fileUrl: { contains: '/medical-records/' } }
        }
    });

    for (const report of reports) {
        const oldPath = getStoragePathFromUrl(report.fileUrl);
        if (!oldPath || oldPath.startsWith('users/')) continue;

        const fileName = path.basename(oldPath);
        const newPath = `users/${report.userId}/medical-records/${fileName}`;
        // Note: CDN URL might be null for private folders, but we'll use a direct URL or handled by app
        const newUrl = toCDNUrl(newPath); 

        console.log(`   [Health Report] ID: ${report.id} | ${oldPath} -> ${newPath}`);

        if (!IS_DRY_RUN) {
            try {
                await bucket.file(oldPath).move(newPath);
                await prisma.healthReport.update({
                    where: { id: report.id },
                    data: { fileUrl: newUrl }
                });
            } catch (err) {
                console.error(`   ❌ Failed to move health report ${report.id}:`, err.message);
            }
        }
    }

    // ─── Phase 3: Booking Attachments (inside JSON) ────────────
    console.log("\n📂 Phase 3: Migrating Booking Attachments (from JSON)...");
    const bookings = await prisma.booking.findMany({
        where: {
            formDataJson: { not: null }
        }
    });

    for (const booking of bookings) {
        let changed = false;
        const formData = booking.formDataJson;
        if (!formData || typeof formData !== 'object') continue;

        const attachments = formData.attachments || [];
        if (!Array.isArray(attachments)) continue;

        const newAttachments = [];
        for (const url of attachments) {
            const oldPath = getStoragePathFromUrl(url);
            if (!oldPath || oldPath.startsWith('users/')) {
                newAttachments.push(url);
                continue;
            }

            const fileName = path.basename(oldPath);
            const folderName = oldPath.split('/')[0] || 'general';
            const newPath = `users/${booking.userId}/bookings/${folderName}/${fileName}`;
            const newUrl = toCDNUrl(newPath);

            console.log(`   [Booking Attachment] Booking: ${booking.bookingCode} | ${oldPath} -> ${newPath}`);
            
            if (!IS_DRY_RUN) {
                try {
                    await bucket.file(oldPath).move(newPath);
                    newAttachments.push(newUrl);
                    changed = true;
                } catch (err) {
                    console.error(`   ❌ Failed to move booking file ${oldPath}:`, err.message);
                    newAttachments.push(url); // keep original if failed
                }
            } else {
                newAttachments.push(newUrl); // for dry run logging benefit
                changed = true;
            }
        }

        if (changed && !IS_DRY_RUN) {
            await prisma.booking.update({
                where: { id: booking.id },
                data: {
                    formDataJson: {
                        ...formData,
                        attachments: newAttachments
                    }
                }
            });
        }
    }

    console.log(`\n----------------------------------------------------------------------`);
    console.log(`🏁 Migration Completed [${IS_DRY_RUN ? 'DRY RUN' : 'SUCCESS'}]`);
}

migrate()
    .catch(err => {
        console.error("\n❌ CRITICAL ERROR IN MIGRATION:", err);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
