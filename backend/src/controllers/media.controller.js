// ──────────────────────────────────────────────
//  Media Asset Controller (Content Library)
// ──────────────────────────────────────────────

const prisma = require('../config/database');
const { sendResponse, sendPaginatedResponse, paginate } = require('../utils/helpers');
const { uploadToCloudinary, deleteFromCloudinary } = require('../utils/fileUpload');

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
        const { url, publicId, format, size } = await uploadToCloudinary(req.file.buffer, folder);

        const asset = await prisma.mediaAsset.create({
            data: {
                fileName: req.file.originalname,
                fileUrl: url,
                fileType: req.file.mimetype.split('/')[0], // image, video, application
                fileSize: size || req.file.size,
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

        // Extract public ID from URL for Cloudinary deletion
        // URL format: https://res.cloudinary.com/{cloud}/image/upload/v123/medico/folder/filename.ext
        const urlParts = asset.fileUrl.split('/');
        const publicId = urlParts.slice(-3).join('/').replace(/\.[^.]+$/, '');
        await deleteFromCloudinary(publicId);

        await prisma.mediaAsset.delete({ where: { id: req.params.id } });

        sendResponse(res, 200, null, 'Media deleted');
    } catch (error) {
        next(error);
    }
};

module.exports = { getMediaAssets, uploadMedia, deleteMedia };
