// ──────────────────────────────────────────────
//  Upload Pipeline — Orchestrator
//
//  Full flow:
//    1. Validate file (type, size)
//    2. Upload raw file → GCS (primary storage)
//    3. Process: OCR / compression (if applicable)
//    4. Upload processed file → R2 (CDN delivery)
//    5. Return { gcsUrl, cdnUrl, processedData }
//
//  Failures are handled gracefully:
//    - If OCR fails → still returns upload URLs
//    - If R2 fails → falls back to GCS public URL
//    - All operations are logged
// ──────────────────────────────────────────────

const path = require('path');
const sharp = require('sharp');
const { uploadFile, toCDNUrl, makeFilePublic } = require('./storage.service');
const { uploadToR2, isAvailable: r2Available } = require('./r2.service');
const { analyzeBuffer, analyzeDocumentFromGCS } = require('./ocr.service');
const { logger } = require('../config/logger');

// ─── Validation ─────────────────────────────────────────

const ALLOWED_MIME_TYPES = new Set([
    'image/jpeg', 'image/png', 'image/gif', 'image/webp',
    'application/pdf',
]);

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB

const validateFile = (file) => {
    const errors = [];

    if (!file || !file.buffer) {
        errors.push('No file provided');
        return { valid: false, errors };
    }

    if (!ALLOWED_MIME_TYPES.has(file.mimetype)) {
        errors.push(`File type '${file.mimetype}' not allowed. Accepted: ${[...ALLOWED_MIME_TYPES].join(', ')}`);
    }

    if (file.size > MAX_FILE_SIZE) {
        errors.push(`File size ${(file.size / 1024 / 1024).toFixed(1)}MB exceeds ${MAX_FILE_SIZE / 1024 / 1024}MB limit`);
    }

    return { valid: errors.length === 0, errors };
};

// ─── Image Compression ──────────────────────────────────

/**
 * Compress an image buffer. Returns original buffer for non-image types.
 * @param {Buffer} buffer
 * @param {string} mimeType
 * @param {object} opts - { maxWidth, maxHeight, quality }
 * @returns {{ buffer: Buffer, mimeType: string }}
 */
const compressImage = async (buffer, mimeType, opts = {}) => {
    if (!mimeType.startsWith('image/') || mimeType === 'image/gif') {
        return { buffer, mimeType }; // skip GIFs and non-images
    }

    const { maxWidth = 2048, maxHeight = 2048, quality = 80 } = opts;

    try {
        const metadata = await sharp(buffer).metadata();

        // Skip if already small enough
        if ((metadata.width || 0) <= maxWidth && (metadata.height || 0) <= maxHeight && buffer.length < 500 * 1024) {
            return { buffer, mimeType };
        }

        let pipeline = sharp(buffer).resize(maxWidth, maxHeight, { fit: 'inside', withoutEnlargement: true });

        // Output as webp for best compression, but keep original format for compatibility
        if (mimeType === 'image/png') {
            pipeline = pipeline.png({ quality });
        } else {
            pipeline = pipeline.jpeg({ quality, mozjpeg: true });
            mimeType = 'image/jpeg';
        }

        const compressed = await pipeline.toBuffer();

        // Only use compressed if it's actually smaller
        if (compressed.length < buffer.length) {
            logger.info(`Image compressed: ${buffer.length} → ${compressed.length} bytes (${Math.round((1 - compressed.length / buffer.length) * 100)}% reduction)`);
            return { buffer: compressed, mimeType };
        }

        return { buffer, mimeType };
    } catch (err) {
        logger.warn('Image compression failed, using original:', err.message);
        return { buffer, mimeType };
    }
};

// ─── Pipeline Steps ─────────────────────────────────────

/**
 * Step 1: Upload raw file to GCS.
 */
const uploadToGCS = async (buffer, folder, originalName, file) => {
    const rawFolder = `uploads/raw/${folder}`;
    const result = await uploadFile(buffer, rawFolder, originalName, file);
    return result; // { url, storagePath, gcsUri, provider }
};

/**
 * Step 2: Run OCR processing (if applicable).
 * Returns processedData or null.
 */
const runOCR = async (buffer, mimeType, gcsUri, opts = {}) => {
    if (!opts.enableOCR) return null;

    try {
        // Prefer GCS URI path (zero memory overhead on Vision API side)
        if (gcsUri) {
            return await analyzeDocumentFromGCS(gcsUri, mimeType);
        }
        // Fallback to buffer
        return await analyzeBuffer(buffer, mimeType);
    } catch (err) {
        logger.error('Pipeline OCR step failed:', err.message);
        return {
            fullText: '',
            healthTags: [],
            medicalValues: {},
            flagSeverity: 'LOW',
            flagNote: 'OCR processing failed. Manual review recommended.',
        };
    }
};

/**
 * Step 3: Compress image (if applicable).
 */
const runCompression = async (buffer, mimeType, opts = {}) => {
    if (!opts.compress) return { buffer, mimeType };
    return compressImage(buffer, mimeType, opts.compressionOpts);
};

/**
 * Step 4: Upload processed file to R2 for CDN delivery.
 * Falls back to GCS public URL if R2 is unavailable.
 */
const uploadToFinalStorage = async (buffer, folder, originalName, opts = {}) => {
    // Try R2 first (CDN delivery layer)
    if (r2Available()) {
        try {
            const result = await uploadToR2(buffer, folder, originalName, {
                contentType: opts.contentType,
            });
            return {
                cdnUrl: result.cdnUrl,
                r2Path: result.r2Path,
                provider: 'r2',
            };
        } catch (err) {
            logger.warn('R2 upload failed, falling back to GCS:', err.message);
        }
    }

    // Fallback: serve directly from GCS via CDN proxy
    return {
        cdnUrl: null, // will use gcsUrl
        r2Path: null,
        provider: 'gcs-fallback',
    };
};

// ─── Main Pipeline ───────────────────────────────────────

/**
 * Execute the full upload pipeline.
 *
 * @param {object} file - Multer file object { buffer, originalname, mimetype, size }
 * @param {object} opts
 * @param {string} opts.folder - logical folder (e.g. 'nurse-care', 'blood-test')
 * @param {string} opts.userId - for structured path: uploads/raw/{userId}/...
 * @param {boolean} opts.enableOCR - run OCR processing (default false)
 * @param {boolean} opts.compress - compress images (default true)
 * @param {boolean} opts.moveToR2 - upload processed file to R2 (default true)
 * @param {object} opts.compressionOpts - { maxWidth, maxHeight, quality }
 *
 * @returns {{
 *   gcsUrl: string,
 *   cdnUrl: string | null,
 *   storagePath: string,
 *   gcsUri: string,
 *   r2Path: string | null,
 *   processedData: object | null,
 *   fileMetadata: { fileName, fileType, fileSize, mimeType },
 * }}
 */
const processUpload = async (file, opts = {}) => {
    const {
        folder = 'general',
        userId = 'anonymous',
        enableOCR = false,
        compress = true,
        moveToR2 = true,
        compressionOpts = {},
    } = opts;

    const startTime = Date.now();
    const uploadFolder = `${folder}/${userId}`;

    // ── Step 1: Upload raw to GCS ──────────────────────
    const gcsResult = await uploadToGCS(file.buffer, uploadFolder, file.originalname, file);

    logger.info(`Pipeline Step 1 [GCS Upload]: ${Date.now() - startTime}ms`);

    // ── Step 2: OCR (runs in parallel with compression) ─
    const ocrPromise = runOCR(file.buffer, file.mimetype, gcsResult.gcsUri, { enableOCR });

    // ── Step 3: Compress ────────────────────────────────
    const { buffer: processedBuffer, mimeType: processedMimeType } = await runCompression(
        file.buffer,
        file.mimetype,
        { compress, compressionOpts },
    );

    logger.info(`Pipeline Step 3 [Compression]: ${Date.now() - startTime}ms`);

    // ── Step 4: Upload processed to R2 (or GCS fallback) ─
    let finalResult = { cdnUrl: null, r2Path: null, provider: 'gcs' };
    if (moveToR2) {
        finalResult = await uploadToFinalStorage(processedBuffer, folder, file.originalname, {
            contentType: processedMimeType,
        });
    }

    logger.info(`Pipeline Step 4 [Final Storage]: ${Date.now() - startTime}ms`);

    // ── Wait for OCR ────────────────────────────────────
    const processedData = await ocrPromise;

    logger.info(`Pipeline Complete: ${Date.now() - startTime}ms total`);

    // ── Build response ──────────────────────────────────
    const cdnUrl = finalResult.cdnUrl || toCDNUrl(gcsResult.storagePath) || gcsResult.url;

    return {
        gcsUrl: gcsResult.url,
        cdnUrl,
        storagePath: gcsResult.storagePath,
        gcsUri: gcsResult.gcsUri,
        r2Path: finalResult.r2Path,
        provider: finalResult.provider,
        processedData,
        fileMetadata: {
            fileName: file.originalname,
            fileType: file.mimetype.split('/')[0],
            fileSize: file.size,
            mimeType: file.mimetype,
            compressedSize: processedBuffer.length,
        },
    };
};

/**
 * Lightweight upload — skips OCR & R2, just uploads to GCS and makes it public.
 * Used for service booking attachments where CDN isn't critical.
 */
const quickUpload = async (file, folder = 'general') => {
    const validation = validateFile(file);
    if (!validation.valid) {
        throw new Error(validation.errors.join('; '));
    }

    const result = await uploadFile(file.buffer, folder, file.originalname, file);
    return {
        url: result.url,
        storagePath: result.storagePath,
        gcsUri: result.gcsUri,
        provider: result.provider,
    };
};

module.exports = {
    processUpload,
    quickUpload,
    validateFile,
    compressImage,
};
