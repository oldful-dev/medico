// One-off repair: the assets.ayuxacare.com CDN's Cloudflare transform rule
// always maps "<path>" -> gs://<bucket>/mobile/assets/images/<path>. Any
// object stored outside that exact GCS prefix (staff-compliance, admin-
// compliance, prescriptions, users/.../bookings, etc.) was given a CDN URL
// that 404s, because toCDNUrl() previously allowlisted-by-exclusion instead
// of only using the CDN domain for the one prefix it actually serves.
// This script rewrites already-stored broken URLs to direct GCS URLs
// (unconditionally correct, per storage.service.js's own PRIVATE_FOLDERS
// comment: public folders already have IAM allUsers -> Storage Object Viewer).
// The underlying GCS objects are untouched — only the stored URL strings change.

const prisma = require('../src/config/database');

const CDN_BASE = (process.env.ASSETS_CDN_URL || 'https://assets.ayuxacare.com').replace(/\/+$/, '');
const GCS_BUCKET = process.env.GOOGLE_STORAGE_BUCKET_NAME;

function fixUrl(url) {
    if (!url || typeof url !== 'string') return url;
    if (!url.startsWith(`${CDN_BASE}/`)) return url;
    const storagePath = url.slice(`${CDN_BASE}/`.length);
    if (storagePath.startsWith('mobile/assets/images/')) return url; // genuinely CDN-compatible, leave alone
    return `https://storage.googleapis.com/${GCS_BUCKET}/${storagePath}`;
}

(async () => {
    if (!GCS_BUCKET) {
        console.error('GOOGLE_STORAGE_BUCKET_NAME not set, aborting.');
        process.exit(1);
    }

    // 1. MediaAsset.fileUrl
    const assets = await prisma.mediaAsset.findMany();
    let assetsFixed = 0;
    for (const a of assets) {
        const fixed = fixUrl(a.fileUrl);
        if (fixed !== a.fileUrl) {
            await prisma.mediaAsset.update({ where: { id: a.id }, data: { fileUrl: fixed } });
            assetsFixed++;
        }
    }
    console.log(`MediaAsset rows fixed: ${assetsFixed}`);

    // 2. Caregiver.documentsJson (aadhaarUrl, panUrl, policeVerificationUrl, certificationUrl)
    const caregivers = await prisma.caregiver.findMany({ where: { documentsJson: { not: null } } });
    let caregiversFixed = 0;
    for (const c of caregivers) {
        const docs = { ...(c.documentsJson || {}) };
        let changed = false;
        for (const key of Object.keys(docs)) {
            const fixed = fixUrl(docs[key]);
            if (fixed !== docs[key]) { docs[key] = fixed; changed = true; }
        }
        if (changed) {
            await prisma.caregiver.update({ where: { id: c.id }, data: { documentsJson: docs } });
            caregiversFixed++;
        }
    }
    console.log(`Caregiver rows fixed: ${caregiversFixed}`);

    // 3. Admin.documentsJson (aadhaarUrl, panUrl — plus bio-profile fields, which fixUrl leaves untouched)
    const admins = await prisma.admin.findMany({ where: { documentsJson: { not: null } } });
    let adminsFixed = 0;
    for (const a of admins) {
        const docs = { ...(a.documentsJson || {}) };
        let changed = false;
        for (const key of Object.keys(docs)) {
            if (typeof docs[key] !== 'string') continue; // skip fullBio arrays etc.
            const fixed = fixUrl(docs[key]);
            if (fixed !== docs[key]) { docs[key] = fixed; changed = true; }
        }
        if (changed) {
            await prisma.admin.update({ where: { id: a.id }, data: { documentsJson: docs } });
            adminsFixed++;
        }
    }
    console.log(`Admin rows fixed: ${adminsFixed}`);

    // 4. HealthReport.fileUrl (client medical documents)
    const reports = await prisma.healthReport.findMany();
    let reportsFixed = 0;
    for (const r of reports) {
        const fixed = fixUrl(r.fileUrl);
        if (fixed !== r.fileUrl) {
            await prisma.healthReport.update({ where: { id: r.id }, data: { fileUrl: fixed } });
            reportsFixed++;
        }
    }
    console.log(`HealthReport rows fixed: ${reportsFixed}`);

    console.log('Done.');
    process.exit(0);
})();
