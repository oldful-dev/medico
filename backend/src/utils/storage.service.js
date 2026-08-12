// ══════════════════════════════════════════════════════════════
//  Storage Service — Production Grade (GCS-Only)
//
//  ⚠️  STRICT POLICY: Google Cloud Storage is the ONLY storage
//  provider. Cloudflare is used EXCLUSIVELY as a CDN delivery
//  layer. Do NOT add fallback storage providers (R2, S3, etc.).
//
//  Architecture:
//    User → Cloudflare CDN (assets.ayuxa.com) → GCS (ayuxa-assets)
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
//    ASSETS_CDN_URL (assets.ayuxa.com) → Cloudflare Transform Rule → GCS
//
//  Security:
//    - Uniform Bucket-Level Access (no per-object ACLs)
//    - Public folders: IAM allUsers → Storage Object Viewer
//    - Private folders: V4 signed URLs (read/write)
//    - CDN cache purge via Cloudflare API
// ══════════════════════════════════════════════════════════════

const { Storage } = require('@google-cloud/storage');
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
    if (!folder) return false;
    return PRIVATE_FOLDERS.has(folder) ||
           folder.startsWith('documents/') ||
           folder.startsWith('admin/') ||
           folder.includes('health-reports') ||
           folder.includes('medical-records') ||
           folder.includes('documents');
};

/**
 * Build a structured, collision-free file path.
 * If userId is provided, nests under /users/{userId}/... for "Beautiful Structure".
 * 
 * @param {string} folder - logical category (e.g. 'health-reports')
 * @param {string} originalName - for extension extraction
 * @param {string|null} userId - optional owner ID for nesting
 */
const buildFilePath = (folder, originalName, userId = null) => {
    const ext = path.extname(originalName);
    const fileName = `${uuidv4()}${ext}`;
    
    // Bypass user ID nesting for mobile assets folder
    if (folder === 'mobile/assets/images') {
        return `${folder}/${fileName}`;
    }
    
    if (!userId || userId === 'anonymous') {
        return `${folder}/${fileName}`;
    }

    // Beautiful Hierarchy Logic
    if (folder === 'profile-avatars' || folder === 'avatar') {
        // Use avatar-{hash}.jpg to create unique filename each upload (better cache busting)
        // This forces CDN to fetch fresh content instead of relying on query params
        const hash = Math.random().toString(36).substring(2, 8);
        return `users/${userId}/profile/avatar-${hash}.jpg`;
    }

    if (folder === 'health-reports' || folder === 'records' || folder === 'medical-records') {
        return `users/${userId}/medical-records/${fileName}`;
    }

    if (folder === 'sla-documents' || folder === 'documents' || folder === 'user-docs') {
        return `users/${userId}/documents/${fileName}`;
    }

    // For service bookings, nest under bookings/
    if (folder.includes('-') || folder === 'doctor-visits' || folder === 'general' || folder === 'attachments') {
       return `users/${userId}/bookings/${folder}/${fileName}`;
    }

    // Default nested structure
    return `users/${userId}/${folder}/${fileName}`;
};

// ══════════════════════════════════════════════════════════════
//  Google Cloud Storage — SOLE STORAGE PROVIDER
// ══════════════════════════════════════════════════════════════
const gcsBucketName = process.env.GOOGLE_STORAGE_BUCKET_NAME;
let gcsStorage = null;
let gcsBucket = null;

try {
    gcsStorage = new Storage({ keyFilename: process.env.FIREBASE_SERVICE_ACCOUNT_PATH });
    if (gcsBucketName) {
        gcsBucket = gcsStorage.bucket(gcsBucketName);
        logger.info(`☁️  GCS initialized — bucket: ${gcsBucketName} (sole provider)`);
    } else {
        logger.error('❌ GOOGLE_STORAGE_BUCKET_NAME is not set. Storage will not work.');
    }
} catch (err) {
    logger.error('❌ GCS initialization FAILED:', err.message);
}

// ══════════════════════════════════════════════════════════════
//  CDN URL BUILDER (sanitized, safe)
//
//  Generates: https://assets.ayuxa.com/{storagePath}
//  Sanitizes double slashes, leading slashes, and empty paths.
//  For private folders → returns null (use signed download URL)
// ══════════════════════════════════════════════════════════════
const toCDNUrl = (storagePath, folder = '') => {
    if (!storagePath) return null;

    // Private folders don't get public CDN URLs
    if (isPrivateFolder(folder || storagePath.split('/')[0])) return null;

    // Sanitize: remove leading slashes and collapse double slashes
    let cleanPath = storagePath.replace(/^\/+/, '').replace(/\/\//g, '/');
    if (!cleanPath) return null;

    const prefix = 'mobile/assets/images/';
    const startsWithPrefix = cleanPath.startsWith(prefix);
    if (startsWithPrefix) {
        cleanPath = cleanPath.substring(prefix.length);
    }

    // Use direct GCS path (ayuxa-assets) for profiles and documents to ensure correct GCS path representation
    if (folder !== 'profiles' && folder !== 'documents') {
        const cdnBase = (process.env.ASSETS_CDN_URL || '').replace(/\/+$/, '');
        if (cdnBase) return `${cdnBase}/${cleanPath}`;
    }

    // Fallback: GCS direct public URL (only if no CDN configured or bypassed)
    if (gcsBucketName) {
        const fullGcsPath = startsWithPrefix ? `${prefix}${cleanPath}` : cleanPath;
        return `https://storage.googleapis.com/${gcsBucketName}/${fullGcsPath}`;
    }

    return null;
};

// ─── GCS direct URL (internal use only) ──────────
const toGCSUrl = (storagePath) => {
    if (!gcsBucketName || !storagePath) return null;
    const cleanPath = storagePath.replace(/^\/+/, '').replace(/\/\//g, '/');
    return `https://storage.googleapis.com/${gcsBucketName}/${cleanPath}`;
};

// ══════════════════════════════════════════════════════════════
//  CLOUDFLARE CACHE PURGE (CDN-only, no storage operations)
// ══════════════════════════════════════════════════════════════
const purgeCDNCache = async (fileUrl) => {
    const apiKey = process.env.CLOUDFLARE_API_KEY;
    const zoneId = process.env.CLOUDFLARE_ZONE_ID;
    if (!apiKey || !zoneId || !fileUrl) return;

    try {
        const urls = [fileUrl];
        // Also purge the GCS direct URL variant if CDN URL was provided
        const cdnBase = (process.env.ASSETS_CDN_URL || '').replace(/\/+$/, '');
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
        logger.warn('CDN cache purge failed (non-fatal):', err.message);
    }
};

// ══════════════════════════════════════════════════════════════
//  UPLOAD FILE — GCS ONLY (server-side proxy)
//  For client-direct uploads, use getSignedUploadUrl() instead.
//  ⚠️  No fallback to any other provider. If GCS fails, it throws.
// ══════════════════════════════════════════════════════════════
const uploadFile = async (buffer, folder = 'general', originalName = 'file', file = null, userId = null) => {
    if (!gcsBucket) {
        const msg = 'GCS is not configured. Cannot upload. Check GOOGLE_STORAGE_BUCKET_NAME and FIREBASE_SERVICE_ACCOUNT_PATH.';
        logger.error(`❌ ${msg}`);
        throw new Error(msg);
    }

    const storagePath = buildFilePath(folder, originalName, userId);
    const contentType = detectMimeType(originalName, file);
    const isPrivate = isPrivateFolder(folder);

    logger.info(`📤 buildFilePath called: folder="${folder}", originalName="${originalName}", userId="${userId}" → storagePath="${storagePath}"`);

    try {
        const gcsFile = gcsBucket.file(storagePath);

        // For profile avatars, delete old file BEFORE saving new one
        if ((folder === 'profile-avatars' || folder === 'avatar') && userId && userId !== 'anonymous') {
            try {
                const [exists] = await gcsFile.exists();
                if (exists) {
                    await gcsFile.delete();
                    logger.info(`🗑️ Deleted old avatar for user ${userId}`);
                }
            } catch (deleteErr) {
                // Don't block upload if delete fails
                logger.warn(`⚠️ Failed to delete old avatar: ${deleteErr.message}`);
            }
        }

        // Set appropriate cache headers based on folder type
        const metadata = {
            cacheControl: isPrivate
                ? 'private, no-cache'
                : 'public, max-age=31536000, immutable',
        };

        // Use non-resumable upload for smaller files to speed up
        const useResumable = buffer.length > 10 * 1024 * 1024; // Only resumable for >10MB

        await gcsFile.save(buffer, {
            resumable: useResumable,
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

        logger.info(`✅ Uploaded to GCS [${isPrivate ? 'private' : 'public'}]: ${storagePath}`);
        return { success: true, url, storagePath, gcsUri, gcsUrl, provider: 'gcs', isPrivate };
    } catch (err) {
        logger.error(`❌ GCS upload FAILED for ${storagePath}: ${err.message}`);
        throw new Error(`GCS upload failed: ${err.message}`);
    }
};

// ══════════════════════════════════════════════════════════════
//  SIGNED URL — UPLOAD (client → GCS directly, bypasses Node.js)
//  Flow: client → POST /media/signed-url → PUT to GCS → POST /media/confirm
// ══════════════════════════════════════════════════════════════
const getSignedUploadUrl = async (folder, originalName, contentType, expiresMinutes = 15, userId = null) => {
    if (!gcsBucket) throw new Error('GCS not configured');

    const storagePath = buildFilePath(folder, originalName, userId);
    const gcsFile = gcsBucket.file(storagePath);
    const isPrivate = isPrivateFolder(folder);

    const [signedUrl] = await gcsFile.getSignedUrl({
        version: 'v4',
        action: 'write',
        expires: Date.now() + expiresMinutes * 60 * 1000,
        contentType,
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
const getSignedDownloadUrl = async (storagePath, expiresMinutes = null) => {
    if (!gcsBucket) return null;

    // Determine granular expiration based on storage path folder patterns if not explicitly provided
    let duration = expiresMinutes;
    if (!duration) {
        const pathLower = storagePath.toLowerCase();
        if (pathLower.includes('invoice')) {
            duration = 10080; // 7 days (invoices/receipts)
        } else if (pathLower.includes('avatar') || pathLower.includes('profile')) {
            duration = 10080; // 7 days (user profile images)
        } else if (pathLower.includes('health-report') || pathLower.includes('record') || pathLower.includes('medical')) {
            duration = 30;    // 30 minutes (highly sensitive medical reports)
        } else {
            duration = 60;    // 60 minutes default for other files
        }
    }

    const gcsFile = gcsBucket.file(storagePath);
    const [signedUrl] = await gcsFile.getSignedUrl({
        version: 'v4',
        action: 'read',
        expires: Date.now() + duration * 60 * 1000,
    });

    return signedUrl;
};

// ══════════════════════════════════════════════════════════════
//  REFRESH SIGNED URL — re-sign an expired private-file URL
//  Accepts either a previously-signed URL (with expired token) or
//  a plain gs://.../CDN URL, strips host + query string, and
//  re-derives storagePath to issue a fresh signed download URL.
// ══════════════════════════════════════════════════════════════
const getStoragePathFromUrl = (fileUrl) => {
    const cdnBase = (process.env.ASSETS_CDN_URL || '').replace(/\/+$/, '');
    const gcsBase = `https://storage.googleapis.com/${gcsBucketName}/`;

    // Strip query string (signed URLs carry ?X-Goog-Signature=... etc.)
    const [urlWithoutQuery] = fileUrl.split('?');

    if (cdnBase && urlWithoutQuery.startsWith(cdnBase)) {
        return urlWithoutQuery.replace(`${cdnBase}/`, '');
    }
    if (urlWithoutQuery.startsWith(gcsBase)) {
        return urlWithoutQuery.replace(gcsBase, '');
    }
    return null;
};

const refreshSignedUrl = async (fileUrl, expiresMinutes = null) => {
    const storagePath = getStoragePathFromUrl(fileUrl);
    if (!storagePath) {
        logger.warn('refreshSignedUrl: could not derive storagePath from fileUrl:', fileUrl);
        return null;
    }
    return getSignedDownloadUrl(storagePath, expiresMinutes);
};

// ══════════════════════════════════════════════════════════════
//  DELETE FILE — GCS ONLY + CDN purge
// ══════════════════════════════════════════════════════════════
const deleteFile = async (fileUrl, storagePath = null) => {
    if (!storagePath) {
        const cdnBase = (process.env.ASSETS_CDN_URL || '').replace(/\/+$/, '');
        const gcsBase = `https://storage.googleapis.com/${gcsBucketName}/`;

        if (cdnBase && fileUrl.startsWith(cdnBase)) {
            storagePath = fileUrl.replace(`${cdnBase}/`, '');
        } else if (fileUrl.startsWith(gcsBase)) {
            storagePath = fileUrl.replace(gcsBase, '');
        }
    }

    if (!storagePath) {
        logger.warn('deleteFile: could not derive storagePath from fileUrl:', fileUrl);
        return false;
    }

    try {
        if (!gcsBucket) {
            logger.error('❌ GCS not configured. Cannot delete file.');
            return false;
        }
        await gcsBucket.file(storagePath).delete({ ignoreNotFound: true });
        logger.info(`🗑️  Deleted from GCS: ${storagePath}`);

        await purgeCDNCache(fileUrl);
        return true;
    } catch (err) {
        logger.error(`❌ GCS delete FAILED for ${storagePath}: ${err.message}`);
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
//  STORAGE HEALTH CHECK — GCS + CDN only
// ══════════════════════════════════════════════════════════════
const healthCheck = async () => {
    const status = { gcs: false, cdn: false, cdnCacheStatus: null };

    // GCS
    if (gcsBucket) {
        try {
            const [exists] = await gcsBucket.exists();
            status.gcs = exists;
        } catch { status.gcs = false; }
    }

    // CDN (Cloudflare)
    const cdnBase = process.env.ASSETS_CDN_URL;
    if (cdnBase) {
        try {
            const res = await fetch(cdnBase, { method: 'HEAD', signal: AbortSignal.timeout(5000) });
            status.cdn = res.status < 500;
            // Verify Cloudflare cf-cache-status header
            status.cdnCacheStatus = res.headers.get('cf-cache-status') || 'NOT_CLOUDFLARE';
        } catch { status.cdn = false; }
    }

    return status;
};

module.exports = {
    uploadFile,
    getSignedUploadUrl,
    getSignedDownloadUrl,
    refreshSignedUrl,
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
