// ──────────────────────────────────────────────
//  Storage Service (Cloudflare R2 & Google Cloud Storage)
// ──────────────────────────────────────────────

const { Storage } = require('@google-cloud/storage');
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
const path = require('path');
const { logger } = require('../config/logger');

// ─── MIME Detection (S-05 fix) ──────────────────
const MIME_MAP = {
    '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png',
    '.gif': 'image/gif', '.webp': 'image/webp', '.svg': 'image/svg+xml',
    '.pdf': 'application/pdf', '.mp4': 'video/mp4', '.mp3': 'audio/mpeg',
    '.doc': 'application/msword', '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
};

const detectMimeType = (filename, file) => {
    if (file?.mimetype) return file.mimetype;
    const ext = path.extname(filename).toLowerCase();
    return MIME_MAP[ext] || 'application/octet-stream';
};

// --- Cloudflare R2 Configuration ---
const r2Config = {
    accountId: process.env.R2_ACCOUNT_ID,
    accessKeyId: process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
    bucketName: process.env.R2_BUCKET_NAME,
};

let r2Client;
if (r2Config.accountId && r2Config.accessKeyId && r2Config.secretAccessKey) {
    r2Client = new S3Client({
        region: 'auto',
        endpoint: `https://${r2Config.accountId}.r2.cloudflarestorage.com`,
        credentials: {
            accessKeyId: r2Config.accessKeyId,
            secretAccessKey: r2Config.secretAccessKey,
        },
    });
    logger.info('☁️ Cloudflare R2 Storage initialized');
}

// --- Google Cloud Storage Configuration ---
const gcsStorage = new Storage({
    keyFilename: process.env.FIREBASE_SERVICE_ACCOUNT_PATH,
});
const gcsBucketName = process.env.GOOGLE_STORAGE_BUCKET_NAME;
const gcsBucket = gcsStorage.bucket(gcsBucketName);

/**
 * Upload a buffer to Storage (R2 preferred, GCS fallback)
 * @param {Buffer} buffer 
 * @param {string} folder 
 * @param {string} originalName 
 * @param {object} [file] - Optional multer file object (for mimetype detection)
 */
const uploadFile = async (buffer, folder = 'general', originalName = 'file', file = null) => {
    const fileName = `${folder}/${Date.now()}-${originalName}`;
    const contentType = detectMimeType(originalName, file);

    try {
        // Option A: Cloudflare R2
        if (r2Client && r2Config.bucketName) {
            const command = new PutObjectCommand({
                Bucket: r2Config.bucketName,
                Key: fileName,
                Body: buffer,
                ContentType: contentType,
            });

            await r2Client.send(command);
            
            const publicUrl = process.env.ASSETS_CDN_URL 
                ? `${process.env.ASSETS_CDN_URL.replace(/\/$/, '')}/${fileName}`
                : `https://${r2Config.bucketName}.${r2Config.accountId}.r2.cloudflarestorage.com/${fileName}`;

            return { success: true, url: publicUrl, fileName };
        }

        // Option B: Google Cloud Storage
        if (gcsBucketName) {
            const gcsFile = gcsBucket.file(fileName);
            await gcsFile.save(buffer, { resumable: false, contentType });

            let publicUrl = `https://storage.googleapis.com/${gcsBucketName}/${fileName}`;
            if (process.env.ASSETS_CDN_URL) {
                publicUrl = `${process.env.ASSETS_CDN_URL.replace(/\/$/, '')}/${fileName}`;
            }

            return { success: true, url: publicUrl, fileName };
        }

        throw new Error('No storage provider configured (R2 or GCS)');
    } catch (error) {
        logger.error('Storage Upload Error:', error);
        throw error;
    }
};

module.exports = {
    uploadFile,
    uploadToGCS: uploadFile, // Alias for backward compatibility
};


