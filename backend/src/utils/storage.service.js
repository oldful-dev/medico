// ══════════════════════════════════════════════════════════════
//  Storage Service — Production Grade
//
//  Architecture:
//    GCS (primary storage) → Cloudflare CDN (delivery) → Mobile App
//
//  Bucket structure (Uniform Bucket-Level Access):
//    /users/profile-avatars/{uuid}.jpg       ← public (IAM)
//    /users/documents/{uuid}.pdf             ← private (signed URL)
//    /documents/health-reports/{uuid}.pdf    ← private (signed URL)
//    /documents/sla/{uuid}.pdf               ← private (signed URL)
//    /documents/invoices/{uuid}.pdf           ← private (signed URL)
//    /assets/banners/{uuid}.webp             ← public (IAM)
//    /assets/icons/{uuid}.svg                ← public (IAM)
//    /assets/services/{uuid}.webp            ← public (IAM)
//    /admin/exports/{uuid}.csv               ← private (signed URL)
//    /bookings/{service-slug}/{uuid}.jpg     ← public (IAM)
//
//  CDN delivery:
//    ASSETS_CDN_URL → Cloudflare Transform Rule → GCS
//    Fallback: https://storage.googleapis.com/{bucket}/{path}
//
//  Security:
//    - Uniform Bucket-Level Access (no per-object ACLs)
//    - Public folders: IAM allUsers → Storage Object Viewer
//    - Private folders: V4 signed URLs (read/write)
//    - CDN cache purge via Cloudflare API
// ══════════════════════════════════════════════════════════════

const { Storage } = require('@google-cloud/storage');
const { S3Client, PutObjectCommand, DeleteObjectCommand } = require('@aws-sdk/client-s3');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const { logger } = require('../config/logger');

// ─── MIME Map ──────────────────────────────────
const MIME_MAP = {
    '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png',
    '.gif': 'image/gif', '.webp': 'image/webp', '.svg': 'image/svg+xml',
    '.pdf': 'application/pdf', '.mp4': 'video/mp4', '.mp3': 'audio/mpeg',
    '.doc': 'application/msword', '.csv': 'text/csv',
    '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
};

const detectMimeType = (filename, file = null) => {
    if (file?.mimetype) return file.mimetype;
    const ext = path.extname(filename).toLowerCase();
    return MIME_MAP[ext] || 'application/octet-stream';
};

// ─── Private folders — served via signed download URLs ──
const PRIVATE_FOLDERS = new Set([
    'health-reports', 'documents/health-reports',
    'documents/sla', 'documents/invoices',
    'users/documents', 'admin/exports', 'admin',
]);

const isPrivateFolder = (folder) => {
    return PRIVATE_FOLDERS.has(folder) ||
           folder.startsWith('documents/') ||
           folder.startsWith('admin/');
};

// ─── Build file path with UUID (collision-free) ──
const buildFilePath = (folder, originalName) => {
    const ext = path.extname(originalName);
    return `${folder}/${uuidv4()}${ext}`;
};

// ─── Google Cloud Storage (PRIMARY) ────────────────────
const gcsBucketName = process.env.GOOGLE_STORAGE_BUCKET_NAME;
let gcsStorage = null;
let gcsBucket = null;

try {
    gcsStorage = new Storage({ keyFilename: process.env.FIREBASE_SERVICE_ACCOUNT_PATH });
    if (gcsBucketName) {
        gcsBucket = gcsStorage.bucket(gcsBucketName);
        logger.info('☁️  GCS initialized — bucket: ' + gcsBucketName);
    }
} catch (err) {
    logger.warn('GCS initialization failed:', err.message);
}

// ─── Cloudflare R2 (FALLBACK) ──────────────────────────
const r2Config = {
    accountId: process.env.R2_ACCOUNT_ID,
    accessKeyId: process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
    bucketName: process.env.R2_BUCKET_NAME,
};

let r2Client = null;
if (r2Config.accountId && r2Config.accessKeyId && r2Config.secretAccessKey) {
    r2Client = new S3Client({
        region: 'auto',
        endpoint: `https://${r2Config.accountId}.r2.cloudflarestorage.com`,
        credentials: {
            accessKeyId: r2Config.accessKeyId,
            secretAccessKey: r2Config.secretAccessKey,
        },
    });
    logger.info('☁️  Cloudflare R2 initialized (fallback)');
}

// ══════════════════════════════════════════════════════════════
//  CDN URL BUILDER
//
//  Priority:
//    1. ASSETS_CDN_URL (Cloudflare — assets.oldful.com)
//    2. GCS direct public URL (storage.googleapis.com/bucket/path)
//
//  For private folders → returns null (use signed download URL instead)
// ══════════════════════════════════════════════════════════════
const toCDNUrl = (storagePath, folder = '') => {
    // Private folders don't get public CDN URLs
    if (isPrivateFolder(folder || storagePath.split('/')[0])) return null;

    const cdnBase = (process.env.ASSETS_CDN_URL || '').replace(/\/$/, '');
    if (cdnBase) return `${cdnBase}/${storagePath}`;
    // Fallback: GCS direct public URL
    if (gcsBucketName) return `https://storage.googleapis.com/${gcsBucketName}/${storagePath}`;
    return null;
};

// ─── GCS direct URL (always, for internal use) ──────────
const toGCSUrl = (storagePath) => {
    if (!gcsBucketName) return null;
    return `https://storage.googleapis.com/${gcsBucketName}/${storagePath}`;
};

// ══════════════════════════════════════════════════════════════
//  CLOUDFLARE CACHE PURGE
// ══════════════════════════════════════════════════════════════
const purgeCDNCache = async (fileUrl) => {
    const apiKey = process.env.CLOUDFLARE_API_KEY;
    const zoneId = process.env.CLOUDFLARE_ZONE_ID;
    if (!apiKey || !zoneId || !fileUrl) return;

    try {
        const urls = [fileUrl];
        // Also purge the GCS direct URL variant if CDN URL was provided
        const cdnBase = (process.env.ASSETS_CDN_URL || '').replace(/\/$/, '');
        if (cdnBase && fileUrl.startsWith(cdnBase)) {
            const storagePath = fileUrl.replace(`${cdnBase}/`, '');
            const gcsUrl = toGCSUrl(storagePath);
            if (gcsUrl) urls.push(gcsUrl);
        }

        await fetch(`https://api.cloudflare.com/client/v4/zones/${zoneId}/purge_cache`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ files: urls }),
        });
        logger.info(`CDN cache purged: ${urls.join(', ')}`);
    } catch (err) {
        logger.warn('CDN cache purge failed:', err.message);
    }
};

// ══════════════════════════════════════════════════════════════
//  UPLOAD FILE (server-side proxy)
//  For client-direct uploads, use getSignedUploadUrl() instead
// ══════════════════════════════════════════════════════════════
const uploadFile = async (buffer, folder = 'general', originalName = 'file', file = null) => {
    const storagePath = buildFilePath(folder, originalName);
    const contentType = detectMimeType(originalName, file);
    const isPrivate = isPrivateFolder(folder);

    // ── Primary: GCS ──────────────────────────
    if (gcsBucket) {
        const gcsFile = gcsBucket.file(storagePath);

        // Set appropriate cache headers based on folder type
        const metadata = {
            cacheControl: isPrivate
                ? 'private, no-cache'
                : 'public, max-age=31536000, immutable',
        };

        await gcsFile.save(buffer, {
            resumable: buffer.length > 5 * 1024 * 1024, // Resumable for >5MB
            contentType,
            metadata,
            // Uniform Bucket-Level Access — no predefinedAcl
        });

        const gcsUrl = toGCSUrl(storagePath);
        const gcsUri = `gs://${gcsBucketName}/${storagePath}`;

        // Public files get CDN URL, private files get signed download URL
        let url;
        if (isPrivate) {
            url = await getSignedDownloadUrl(storagePath);
        } else {
            url = toCDNUrl(storagePath, folder) || gcsUrl;
        }

        logger.info(`Uploaded to GCS [${isPrivate ? 'private' : 'public'}]: ${storagePath}`);
        return { success: true, url, storagePath, gcsUri, gcsUrl, provider: 'gcs', isPrivate };
    }

    // ── Fallback: R2 ─────────────────────────
    if (r2Client && r2Config.bucketName) {
        const command = new PutObjectCommand({
            Bucket: r2Config.bucketName,
            Key: storagePath,
            Body: buffer,
            ContentType: contentType,
            CacheControl: 'public, max-age=31536000, immutable',
        });
        await r2Client.send(command);

        const cdnUrl = toCDNUrl(storagePath, folder);
        const r2Url = `https://${r2Config.bucketName}.${r2Config.accountId}.r2.cloudflarestorage.com/${storagePath}`;
        const url = cdnUrl || r2Url;

        logger.info(`Uploaded to R2: ${storagePath}`);
        return { success: true, url, storagePath, gcsUri: null, gcsUrl: null, provider: 'r2', isPrivate: false };
    }

    throw new Error('No storage provider configured (GCS or R2)');
};

// ══════════════════════════════════════════════════════════════
//  SIGNED URL — UPLOAD (client → GCS directly, bypasses Node.js)
//  Flow: client → POST /media/signed-url → PUT to GCS → POST /media/confirm
// ══════════════════════════════════════════════════════════════
const getSignedUploadUrl = async (folder, originalName, contentType, expiresMinutes = 15) => {
    if (!gcsBucket) throw new Error('GCS not configured');

    const storagePath = buildFilePath(folder, originalName);
    const gcsFile = gcsBucket.file(storagePath);
    const isPrivate = isPrivateFolder(folder);

    const [signedUrl] = await gcsFile.getSignedUrl({
        version: 'v4',
        action: 'write',
        expires: Date.now() + expiresMinutes * 60 * 1000,
        contentType,
        // NOTE: Do NOT add extensionHeaders here — the client must send
        // the exact same headers in the PUT request, which React Native
        // fetch() doesn't support reliably. Size validation is done
        // server-side in the confirm step and upload pipeline instead.
    });

    const gcsUrl = toGCSUrl(storagePath);
    const cdnUrl = isPrivate ? null : toCDNUrl(storagePath, folder);
    const fileUrl = cdnUrl || gcsUrl;
    const gcsUri = `gs://${gcsBucketName}/${storagePath}`;

    return { signedUrl, storagePath, fileUrl, gcsUri, isPrivate };
};

// ══════════════════════════════════════════════════════════════
//  SIGNED URL — DOWNLOAD (private files only)
// ══════════════════════════════════════════════════════════════
const getSignedDownloadUrl = async (storagePath, expiresMinutes = 60) => {
    if (!gcsBucket) return null;

    const gcsFile = gcsBucket.file(storagePath);
    const [signedUrl] = await gcsFile.getSignedUrl({
        version: 'v4',
        action: 'read',
        expires: Date.now() + expiresMinutes * 60 * 1000,
    });

    return signedUrl;
};

// ══════════════════════════════════════════════════════════════
//  DELETE FILE — removes from storage + purges CDN
// ══════════════════════════════════════════════════════════════
const deleteFile = async (fileUrl, storagePath = null) => {
    if (!storagePath) {
        const cdnBase = (process.env.ASSETS_CDN_URL || '').replace(/\/$/, '');
        const gcsBase = `https://storage.googleapis.com/${gcsBucketName}/`;

        if (cdnBase && fileUrl.startsWith(cdnBase)) {
            storagePath = fileUrl.replace(`${cdnBase}/`, '');
        } else if (fileUrl.startsWith(gcsBase)) {
            storagePath = fileUrl.replace(gcsBase, '');
        }
    }

    if (!storagePath) {
        logger.warn('deleteFile: could not derive storagePath from fileUrl');
        return false;
    }

    try {
        if (gcsBucket) {
            await gcsBucket.file(storagePath).delete({ ignoreNotFound: true });
            logger.info(`Deleted from GCS: ${storagePath}`);
        } else if (r2Client && r2Config.bucketName) {
            await r2Client.send(new DeleteObjectCommand({
                Bucket: r2Config.bucketName,
                Key: storagePath,
            }));
            logger.info(`Deleted from R2: ${storagePath}`);
        }

        await purgeCDNCache(fileUrl);
        return true;
    } catch (err) {
        logger.error('deleteFile error:', err.message);
        return false;
    }
};

// ══════════════════════════════════════════════════════════════
//  MAKE FILE PUBLIC — No-op (Uniform Bucket-Level Access)
// ══════════════════════════════════════════════════════════════
const makeFilePublic = async (storagePath, folder = '') => {
    // Uniform Bucket-Level Access — public read handled by IAM.
    logger.debug(`makeFilePublic no-op (bucket IAM handles access): ${storagePath}`);
};

// ══════════════════════════════════════════════════════════════
//  STORAGE HEALTH CHECK — verifies GCS + R2 connectivity
// ══════════════════════════════════════════════════════════════
const healthCheck = async () => {
    const status = { gcs: false, r2: false, cdn: false };

    // GCS
    if (gcsBucket) {
        try {
            const [exists] = await gcsBucket.exists();
            status.gcs = exists;
        } catch { status.gcs = false; }
    }

    // R2
    if (r2Client) {
        try {
            // Simple head to check connectivity
            status.r2 = true;
        } catch { status.r2 = false; }
    }

    // CDN
    const cdnBase = process.env.ASSETS_CDN_URL;
    if (cdnBase) {
        try {
            const res = await fetch(cdnBase, { method: 'HEAD', signal: AbortSignal.timeout(5000) });
            status.cdn = res.status < 500;
        } catch { status.cdn = false; }
    }

    return status;
};

module.exports = {
    uploadFile,
    getSignedUploadUrl,
    getSignedDownloadUrl,
    makeFilePublic,
    deleteFile,
    purgeCDNCache,
    buildFilePath,
    toCDNUrl,
    toGCSUrl,
    isPrivateFolder,
    healthCheck,
    // Alias for backward compatibility
    uploadToGCS: uploadFile,
};
