// ──────────────────────────────────────────────
//  Media Asset Controller (Content Library)
// ──────────────────────────────────────────────

const prisma = require('../config/database');
const { sendResponse, sendPaginatedResponse, paginate } = require('../utils/helpers');
const { uploadFile } = require('../utils/storage.service');
const { logger } = require('../config/logger');

// GET /api/media
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

// POST /api/media/upload
const uploadMedia = async (req, res, next) => {
    try {
        if (!req.file) return res.status(400).json({ success: false, message: 'File required' });

        const folder = req.body.folder || 'general';
        const { url } = await uploadFile(req.file.buffer, folder, req.file.originalname);

        const asset = await prisma.mediaAsset.create({
            data: {
                fileName: req.file.originalname,
                fileUrl: url,
                fileType: req.file.mimetype.split('/')[0], // image, video, application
                fileSize: req.file.size,
                folder,
                altText: req.body.altText,
                uploadedBy: req.user?.id,
            },
        });

        sendResponse(res, 201, asset, 'Media uploaded');
    } catch (error) {
        next(error);
    }
};

// DELETE /api/media/:id
const deleteMedia = async (req, res, next) => {
    try {
        const asset = await prisma.mediaAsset.findUnique({ where: { id: req.params.id } });
        if (!asset) return res.status(404).json({ success: false, message: 'Asset not found' });

        // Note: For GCS, we'd delete via file.delete() if full path is known.
        // For now, we'll just remove from DB as per Oldful's "soft-delete" preference for assets.
        await prisma.mediaAsset.delete({ where: { id: req.params.id } });

        sendResponse(res, 200, null, 'Media deleted');
    } catch (error) {
        next(error);
    }
};

module.exports = { getMediaAssets, uploadMedia, deleteMedia };
