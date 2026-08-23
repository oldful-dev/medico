// Diagnostic: walk every stored file URL across MediaAsset, Caregiver.documentsJson,
// Admin.documentsJson, and HealthReport.fileUrl, and check whether the underlying
// GCS object actually exists in the bucket. Read-only — makes no changes.
// Reports every dead link with its source table/row/field so the real cause
// (never-uploaded, deleted, or moved object) can be seen directly instead of
// guessed at from one URL at a time.

const prisma = require('../src/config/database');
const { Storage } = require('@google-cloud/storage');

const GCS_BUCKET = process.env.GOOGLE_STORAGE_BUCKET_NAME;
const storage = new Storage({ keyFilename: process.env.FIREBASE_SERVICE_ACCOUNT_PATH });
const bucket = storage.bucket(GCS_BUCKET);

// Extract the storage path (object key) from any of the URL shapes this codebase produces.
function extractStoragePath(url) {
    if (!url || typeof url !== 'string') return null;
    const gcsDirectPrefix = `https://storage.googleapis.com/${GCS_BUCKET}/`;
    if (url.startsWith(gcsDirectPrefix)) return decodeURIComponent(url.slice(gcsDirectPrefix.length));

    const cdnBase = (process.env.ASSETS_CDN_URL || 'https://assets.ayuxacare.com').replace(/\/+$/, '');
    if (url.startsWith(`${cdnBase}/`)) {
        const rest = decodeURIComponent(url.slice(`${cdnBase}/`.length));
        // CDN domain only ever actually serves mobile/assets/images/<rest>
        return `mobile/assets/images/${rest}`;
    }

    if (url.startsWith('gs://')) {
        const withoutScheme = url.slice('gs://'.length);
        const slashIdx = withoutScheme.indexOf('/');
        return decodeURIComponent(withoutScheme.slice(slashIdx + 1));
    }

    return null; // signed URL, external URL, or unrecognized shape — skip
}

async function checkExists(storagePath) {
    try {
        const [exists] = await bucket.file(storagePath).exists();
        return exists;
    } catch (e) {
        return null; // couldn't check (permissions, transient error, etc.)
    }
}

async function main() {
    if (!GCS_BUCKET) {
        console.error('GOOGLE_STORAGE_BUCKET_NAME not set, aborting.');
        process.exit(1);
    }

    const checks = []; // { source, id, field, url, storagePath }

    const assets = await prisma.mediaAsset.findMany();
    for (const a of assets) {
        checks.push({ source: 'MediaAsset', id: a.id, label: a.fileName, field: 'fileUrl', url: a.fileUrl });
    }

    const caregivers = await prisma.caregiver.findMany({ where: { documentsJson: { not: null } } });
    for (const c of caregivers) {
        const docs = c.documentsJson || {};
        for (const [key, val] of Object.entries(docs)) {
            if (typeof val === 'string' && (val.startsWith('http') || val.startsWith('gs://'))) {
                checks.push({ source: 'Caregiver', id: c.id, label: c.name, field: key, url: val });
            }
        }
    }

    const admins = await prisma.admin.findMany({ where: { documentsJson: { not: null } } });
    for (const a of admins) {
        const docs = a.documentsJson || {};
        for (const [key, val] of Object.entries(docs)) {
            if (typeof val === 'string' && (val.startsWith('http') || val.startsWith('gs://'))) {
                checks.push({ source: 'Admin', id: a.id, label: a.name, field: key, url: val });
            }
        }
    }

    const reports = await prisma.healthReport.findMany();
    for (const r of reports) {
        checks.push({ source: 'HealthReport', id: r.id, label: r.title, field: 'fileUrl', url: r.fileUrl });
    }

    console.log(`Checking ${checks.length} stored file references against GCS bucket "${GCS_BUCKET}"...\n`);

    const broken = [];
    const skipped = [];
    let checked = 0;

    for (const c of checks) {
        const storagePath = extractStoragePath(c.url);
        if (!storagePath) {
            skipped.push(c);
            continue;
        }
        const exists = await checkExists(storagePath);
        checked++;
        if (exists === false) {
            broken.push({ ...c, storagePath });
        } else if (exists === null) {
            broken.push({ ...c, storagePath, uncertain: true });
        }
    }

    console.log(`Checked: ${checked}   Skipped (signed/external URLs): ${skipped.length}\n`);

    if (broken.length === 0) {
        console.log('No broken GCS references found.');
    } else {
        console.log(`BROKEN (${broken.length}):`);
        for (const b of broken) {
            console.log(`  [${b.source}] id=${b.id} "${b.label}" field=${b.field}`);
            console.log(`    url:  ${b.url}`);
            console.log(`    path: ${b.storagePath}${b.uncertain ? '  (could not verify — check permissions)' : ''}`);
        }
    }

    process.exit(0);
}

main();
