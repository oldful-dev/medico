// ──────────────────────────────────────────────
//  Cloudflare R2 Service (S3-compatible)
//  Dedicated module for R2 operations:
//    - Upload processed assets to R2 for CDN delivery
//    - Delete assets from R2
//    - Generate CDN URLs
// ──────────────────────────────────────────────

const { S3Client, PutObjectCommand, DeleteObjectCommand, HeadObjectCommand } = require('@aws-sdk/client-s3');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const { logger } = require('../config/logger');

// ─── MIME Map ──────────────────────────────────
const MIME_MAP = {
    '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png',
    '.gif': 'image/gif', '.webp': 'image/webp', '.svg': 'image/svg+xml',
    '.pdf': 'application/pdf', '.mp4': 'video/mp4', '.mp3': 'audio/mpeg',
};

// ─── R2 Client ──────────────────────────────────
const R2_CONFIG = {
    accountId: process.env.R2_ACCOUNT_ID,
    accessKeyId: process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
    bucketName: process.env.R2_BUCKET_NAME,
    publicUrl: (process.env.R2_PUBLIC_URL || process.env.R2_PUBLIC_URl || '').replace(/\/$/, ''),
};

let r2Client = null;
if (R2_CONFIG.accountId && R2_CONFIG.accessKeyId && R2_CONFIG.secretAccessKey) {
    r2Client = new S3Client({
        region: 'auto',
        endpoint: `https://${R2_CONFIG.accountId}.r2.cloudflarestorage.com`,
        credentials: {
            accessKeyId: R2_CONFIG.accessKeyId,
            secretAccessKey: R2_CONFIG.secretAccessKey,
        },
    });
    logger.info('☁️  R2 Service initialized');
}

const isAvailable = () => !!(r2Client && R2_CONFIG.bucketName);

// ─── CDN URL builder ──────────────────────────
const toCdnUrl = (storagePath) => {
    const cdnBase = (process.env.ASSETS_CDN_URL || '').replace(/\/$/, '');
    if (cdnBase) return `${cdnBase}/${storagePath}`;
    if (R2_CONFIG.publicUrl) return `${R2_CONFIG.publicUrl}/${storagePath}`;
    return null;
};

// ─── Build structured path ─────────────────────
const buildR2Path = (folder, originalName) => {
    const ext = path.extname(originalName).toLowerCase();
    return `service-assets/${folder}/${uuidv4()}${ext}`;
};

/**
 * Upload a buffer to R2.
 * @param {Buffer} buffer - file contents
 * @param {string} folder - logical folder (e.g. 'nurse-care', 'blood-test')
 * @param {string} originalName - original file name (for extension detection)
 * @param {object} [opts] - { contentType, storagePath }
 * @returns {{ cdnUrl, r2Path, bucket }}
 */
const uploadToR2 = async (buffer, folder, originalName, opts = {}) => {
    if (!r2Client || !R2_CONFIG.bucketName) {
        throw new Error('R2 not configured');
    }

    const storagePath = opts.storagePath || buildR2Path(folder, originalName);
    const ext = path.extname(originalName).toLowerCase();
    const contentType = opts.contentType || MIME_MAP[ext] || 'application/octet-stream';

    const command = new PutObjectCommand({
        Bucket: R2_CONFIG.bucketName,
        Key: storagePath,
        Body: buffer,
        ContentType: contentType,
        CacheControl: 'public, max-age=31536000, immutable', // 1 year — assets are content-addressed
    });

    await r2Client.send(command);

    const cdnUrl = toCdnUrl(storagePath);
    logger.info(`Uploaded to R2: ${storagePath}`);

    return {
        cdnUrl,
        r2Path: storagePath,
        bucket: R2_CONFIG.bucketName,
    };
};

/**
 * Check if an object exists in R2.
 */
const exists = async (storagePath) => {
    if (!r2Client || !R2_CONFIG.bucketName) return false;
    try {
        await r2Client.send(new HeadObjectCommand({
            Bucket: R2_CONFIG.bucketName,
            Key: storagePath,
        }));
        return true;
    } catch {
        return false;
    }
};

/**
 * Delete an object from R2 by its storage path.
 */
const deleteFromR2 = async (storagePath) => {
    if (!r2Client || !R2_CONFIG.bucketName) return false;
    try {
        await r2Client.send(new DeleteObjectCommand({
            Bucket: R2_CONFIG.bucketName,
            Key: storagePath,
        }));
        logger.info(`Deleted from R2: ${storagePath}`);
        return true;
    } catch (err) {
        logger.error(`R2 delete failed for ${storagePath}:`, err.message);
        return false;
    }
};

module.exports = {
    isAvailable,
    uploadToR2,
    deleteFromR2,
    exists,
    toCdnUrl,
    buildR2Path,
};
