// ──────────────────────────────────────────────
//  Media Asset Controller
//  Architecture: Signed URL (preferred) + proxy upload (fallback)
// ──────────────────────────────────────────────

const prisma = require('../config/database');
const { sendResponse, sendPaginatedResponse, paginate } = require('../utils/helpers');
const { uploadFile, getSignedUploadUrl, makeFilePublic, deleteFile, purgeCDNCache } = require('../utils/storage.service');
const { logger } = require('../config/logger');

// ── Allowed MIME types ─────────────────────────────────────
const ALLOWED_MIME_TYPES = new Set([
    'image/jpeg', 'image/png', 'image/gif', 'image/webp',
    'application/pdf', 'video/mp4',
]);

// ─────────────────────────────────────────────────────────
//  GET /api/media                       (Admin)
// ─────────────────────────────────────────────────────────
const getMediaAssets = async (req, res, next) => {
    try {
        const { page, limit, skip } = paginate(req.query);
        const { fileType, folder, search } = req.query;

        const where = {};
        if (fileType) where.fileType = fileType;
        if (folder) where.folder = folder;
        if (search) where.fileName = { contains: search, mode: 'insensitive' };

        const [assets, total] = await Promise.all([
            prisma.mediaAsset.findMany({ where, skip, take: limit, orderBy: { createdAt: 'desc' } }),
            prisma.mediaAsset.count({ where }),
        ]);

        sendPaginatedResponse(res, assets, total, page, limit);
    } catch (error) {
        next(error);
    }
};

// ─────────────────────────────────────────────────────────
//  POST /api/media/signed-url           (Authenticated)
//
//  Step 1 of the preferred upload flow:
//  Client requests a GCS signed URL → uploads directly to GCS
//  → calls /api/media/confirm to register in DB
//
//  Body: { folder, fileName, contentType }
// ─────────────────────────────────────────────────────────
const requestSignedUrl = async (req, res, next) => {
    try {
        const { folder = 'general', fileName, contentType } = req.body;

        if (!fileName || !contentType) {
            return res.status(400).json({ success: false, message: 'fileName and contentType are required' });
        }

        if (!ALLOWED_MIME_TYPES.has(contentType)) {
            return res.status(400).json({ success: false, message: `Content type '${contentType}' not allowed` });
        }

        const { signedUrl, storagePath, fileUrl, gcsUri } = await getSignedUploadUrl(
            folder,
            fileName,
            contentType,
            15, // 15-minute window
        );

        res.json({
            success: true,
            data: {
                signedUrl,   // PUT this URL with the raw file bytes
                storagePath, // pass back to /confirm
                fileUrl,     // final CDN URL once confirmed
                gcsUri,      // internal GCS reference
                expiresIn: 900, // seconds
            },
        });
    } catch (error) {
        logger.error('requestSignedUrl error:', error.message);
        next(error);
    }
};

// ─────────────────────────────────────────────────────────
//  POST /api/media/confirm              (Authenticated)
//
//  Step 2: after client has PUT the file directly to GCS,
//  confirm the upload and register the asset in the DB.
//
//  Body: { storagePath, fileUrl, gcsUri, fileName, fileType, fileSize, folder, altText }
// ─────────────────────────────────────────────────────────
const confirmUpload = async (req, res, next) => {
    try {
        const {
            storagePath, fileUrl, gcsUri,
            fileName, fileType, fileSize = 0,
            folder = 'general', altText,
        } = req.body;

        if (!storagePath || !fileUrl) {
            return res.status(400).json({ success: false, message: 'storagePath and fileUrl required' });
        }

        // Make the file publicly readable (signed-URL uploads land as private)
        await makeFilePublic(storagePath, folder);

        // Purge any cached 404 from CDN so the now-public file is served
        if (fileUrl) await purgeCDNCache(fileUrl);

        const asset = await prisma.mediaAsset.create({
            data: {
                fileName: fileName || storagePath.split('/').pop(),
                fileUrl,
                fileType: fileType?.split('/')[0] || 'image', // image, video, application
                fileSize,
                folder,
                altText,
                uploadedBy: req.user?.id || null, // actual user/admin ID
            },
        });

        sendResponse(res, 201, asset, 'Media registered');
    } catch (error) {
        next(error);
    }
};

// ─────────────────────────────────────────────────────────
//  POST /api/media/upload               (Authenticated — proxy fallback)
//
//  Proxy upload: file bytes go through Node.js server.
//  Use this ONLY when signed URL is not available.
//  Prefer /signed-url + /confirm for all production uploads.
// ─────────────────────────────────────────────────────────
const uploadMedia = async (req, res, next) => {
    try {
        if (!req.file) return res.status(400).json({ success: false, message: 'File required' });

        const folder = req.body.folder || 'general';
        const { url, storagePath, gcsUri } = await uploadFile(
            req.file.buffer,
            folder,
            req.file.originalname,
            req.file,
        );

        const asset = await prisma.mediaAsset.create({
            data: {
                fileName: req.file.originalname,
                fileUrl: url,
                fileType: req.file.mimetype.split('/')[0],
                fileSize: req.file.size,
                folder,
                altText: req.body.altText,
                uploadedBy: req.user?.id || null,
            },
        });

        sendResponse(res, 201, asset, 'Media uploaded');
    } catch (error) {
        next(error);
    }
};

// ─────────────────────────────────────────────────────────
//  DELETE /api/media/:id                (Admin)
//
//  Deletes from storage (GCS/R2) + CDN cache purge + DB
// ─────────────────────────────────────────────────────────
const deleteMedia = async (req, res, next) => {
    try {
        const asset = await prisma.mediaAsset.findUnique({ where: { id: req.params.id } });
        if (!asset) return res.status(404).json({ success: false, message: 'Asset not found' });

        // 1. Delete from storage + purge CDN
        const deleted = await deleteFile(asset.fileUrl);
        if (!deleted) {
            logger.warn(`Storage delete failed for asset ${asset.id} — removing DB record anyway`);
        }

        // 2. Remove DB record
        await prisma.mediaAsset.delete({ where: { id: req.params.id } });

        sendResponse(res, 200, null, 'Media deleted');
    } catch (error) {
        next(error);
    }
};

module.exports = { getMediaAssets, requestSignedUrl, confirmUpload, uploadMedia, deleteMedia };
