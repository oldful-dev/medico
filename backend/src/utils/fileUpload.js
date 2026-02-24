// ──────────────────────────────────────────────
//  File Upload Utility (Cloudinary)
// ──────────────────────────────────────────────

const cloudinary = require('../config/cloudinary');
const { logger } = require('../config/logger');

/**
 * Upload a buffer to Cloudinary
 * @param {Buffer} buffer - file buffer
 * @param {string} folder - Cloudinary folder
 * @param {string} resourceType - 'image', 'raw', 'video'
 * @returns {Promise<{url: string, publicId: string}>}
 */
const uploadToCloudinary = (buffer, folder = 'medico', resourceType = 'auto') => {
    return new Promise((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
            {
                folder: `medico/${folder}`,
                resource_type: resourceType,
            },
            (error, result) => {
                if (error) {
                    logger.error('Cloudinary upload error:', error);
                    reject(error);
                } else {
                    resolve({
                        url: result.secure_url,
                        publicId: result.public_id,
                        format: result.format,
                        size: result.bytes,
                    });
                }
            }
        );
        uploadStream.end(buffer);
    });
};

/**
 * Delete a file from Cloudinary
 */
const deleteFromCloudinary = async (publicId) => {
    try {
        await cloudinary.uploader.destroy(publicId);
        logger.info(`Cloudinary file deleted: ${publicId}`);
    } catch (error) {
        logger.error('Cloudinary delete error:', error);
    }
};

module.exports = { uploadToCloudinary, deleteFromCloudinary };
