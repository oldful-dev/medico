// ──────────────────────────────────────────────
//  Upload Controller (GCS-Only)
//  Full pipeline: GCS → OCR → Cloudflare CDN URL
//
//  ⚠️  STRICT POLICY: All uploads go to GCS only.
//  No R2, S3, or any fallback storage provider.
//
//  Endpoints:
//    POST /api/upload              - Full pipeline (proxy upload)
//    POST /api/upload/quick        - Quick upload (GCS only, no OCR)
//    POST /api/upload/batch        - Multiple files at once
//    POST /api/upload/process-existing - Run OCR on already-uploaded file
// ──────────────────────────────────────────────

const prisma = require('../config/database');
const { sendResponse } = require('../utils/helpers');
const { processUpload, quickUpload, validateFile } = require('../utils/upload.pipeline');
const { analyzeMedicalReportFromGCS } = require('../utils/ocr.service');
const { logger } = require('../config/logger');

// ─────────────────────────────────────────────────────────
//  POST /api/upload
//
//  Full pipeline: validate → GCS → compress → OCR → CDN URL → DB
//
//  Body (multipart/form-data):
//    file         - the file to upload
//    folder       - logical folder (e.g. 'health-reports', 'nurse-care')
//    enableOCR    - 'true' to run OCR (default: auto-detect from folder)
//    compress     - 'true' to compress images (default: true)
// ─────────────────────────────────────────────────────────
const fullUpload = async (req, res, next) => {
    try {
        if (!req.file) {
            return res.status(400).json({ success: false, message: 'File required' });
        }

        const validation = validateFile(req.file);
        if (!validation.valid) {
            return res.status(400).json({ success: false, message: validation.errors.join('; ') });
        }

        const folder = req.body.folder || 'general';
        const enableOCR = req.body.enableOCR === 'true' || folder === 'health-reports';
        const compress = req.body.compress !== 'false';
        const userId = req.user?.id || 'anonymous';

        const result = await processUpload(req.file, {
            folder,
            userId,
            enableOCR,
            compress,
        });

        // Register in DB
        const asset = await prisma.mediaAsset.create({
            data: {
                fileName: result.fileMetadata.fileName,
                fileUrl: result.cdnUrl,
                fileType: result.fileMetadata.fileType,
                fileSize: result.fileMetadata.fileSize,
                folder,
                uploadedBy: req.user?.id || null,
            },
        });

        res.status(201).json({
            success: true,
            data: {
                id: asset.id,
                cdnUrl: result.cdnUrl,
                gcsUrl: result.gcsUrl,
                storagePath: result.storagePath,
                provider: result.provider,
                processedData: result.processedData,
                fileMetadata: result.fileMetadata,
            },
        });
    } catch (error) {
        logger.error('fullUpload error:', error.message);
        next(error);
    }
};

// ─────────────────────────────────────────────────────────
//  POST /api/upload/quick
//
//  Quick upload: GCS only, no OCR.
//  For service booking attachments that don't need CDN.
//
//  Body (multipart/form-data):
//    file   - the file to upload
//    folder - logical folder (default: 'general')
// ─────────────────────────────────────────────────────────
const quickUploadHandler = async (req, res, next) => {
    try {
        if (!req.file) {
            return res.status(400).json({ success: false, message: 'File required' });
        }

        const validation = validateFile(req.file);
        if (!validation.valid) {
            return res.status(400).json({ success: false, message: validation.errors.join('; ') });
        }

        const folder = req.body.folder || 'general';
        const result = await quickUpload(req.file, folder);

        // Register in DB
        const asset = await prisma.mediaAsset.create({
            data: {
                fileName: req.file.originalname,
                fileUrl: result.url,
                fileType: req.file.mimetype.split('/')[0],
                fileSize: req.file.size,
                folder,
                uploadedBy: req.user?.id || null,
            },
        });

        res.status(201).json({
            success: true,
            data: {
                id: asset.id,
                url: result.url,
                storagePath: result.storagePath,
                gcsUri: result.gcsUri,
                provider: result.provider,
            },
        });
    } catch (error) {
        logger.error('quickUpload error:', error.message);
        next(error);
    }
};

// ─────────────────────────────────────────────────────────
//  POST /api/upload/batch
//
//  Upload multiple files in one request.
//  Uses the full pipeline for each file.
//
//  Body (multipart/form-data):
//    files[]     - up to 10 files
//    folder      - shared folder for all files
//    enableOCR   - 'true' to run OCR on all files
// ─────────────────────────────────────────────────────────
const batchUpload = async (req, res, next) => {
    try {
        if (!req.files || req.files.length === 0) {
            return res.status(400).json({ success: false, message: 'At least one file required' });
        }

        if (req.files.length > 10) {
            return res.status(400).json({ success: false, message: 'Maximum 10 files per batch' });
        }

        const folder = req.body.folder || 'general';
        const enableOCR = req.body.enableOCR === 'true';
        const userId = req.user?.id || 'anonymous';

        const results = await Promise.allSettled(
            req.files.map(async (file) => {
                const validation = validateFile(file);
                if (!validation.valid) {
                    throw new Error(`${file.originalname}: ${validation.errors.join('; ')}`);
                }

                const result = await processUpload(file, {
                    folder,
                    userId,
                    enableOCR,
                    compress: true,
                });

                const asset = await prisma.mediaAsset.create({
                    data: {
                        fileName: result.fileMetadata.fileName,
                        fileUrl: result.cdnUrl,
                        fileType: result.fileMetadata.fileType,
                        fileSize: result.fileMetadata.fileSize,
                        folder,
                        uploadedBy: req.user?.id || null,
                    },
                });

                return {
                    id: asset.id,
                    fileName: file.originalname,
                    cdnUrl: result.cdnUrl,
                    gcsUrl: result.gcsUrl,
                    processedData: result.processedData,
                    fileMetadata: result.fileMetadata,
                };
            })
        );

        const succeeded = results
            .filter(r => r.status === 'fulfilled')
            .map(r => r.value);
        const failed = results
            .filter(r => r.status === 'rejected')
            .map((r, i) => ({
                fileName: req.files[i]?.originalname,
                error: r.reason?.message || 'Unknown error',
            }));

        res.status(succeeded.length > 0 ? 201 : 400).json({
            success: succeeded.length > 0,
            data: {
                uploaded: succeeded,
                failed,
                total: req.files.length,
                successCount: succeeded.length,
                failCount: failed.length,
            },
        });
    } catch (error) {
        logger.error('batchUpload error:', error.message);
        next(error);
    }
};

// ─────────────────────────────────────────────────────────
//  POST /api/upload/process-existing
//
//  Run OCR on a file that was already uploaded (e.g. via signed URL).
//  Useful when OCR wasn't requested initially.
//
//  Body: { gcsUri, mediaAssetId? }
// ─────────────────────────────────────────────────────────
const processExisting = async (req, res, next) => {
    try {
        const { gcsUri, mediaAssetId, healthReportId } = req.body;

        if (!gcsUri) {
            return res.status(400).json({ success: false, message: 'gcsUri required' });
        }

        const ocrResult = await analyzeMedicalReportFromGCS(gcsUri);

        // Update health report with full OCR results (re-process / retry)
        if (healthReportId) {
            await prisma.healthReport.update({
                where: { id: healthReportId },
                data: {
                    ocrStatus: 'completed',
                    ocrRawText: ocrResult.fullText || null,
                    ocrParsedValues: ocrResult.medicalValues && Object.keys(ocrResult.medicalValues).length > 0
                        ? ocrResult.medicalValues : undefined,
                    ocrHealthTags: ocrResult.healthTags || [],
                    ocrFlags: ocrResult.flags?.length > 0 ? ocrResult.flags : undefined,
                    ocrProcessedAt: new Date(),
                    flagSeverity: ocrResult.flagSeverity || null,
                    flagNote: ocrResult.flagNote || null,
                },
            });
        }

        // Optionally update the media asset record with OCR summary
        if (mediaAssetId) {
            await prisma.mediaAsset.update({
                where: { id: mediaAssetId },
                data: {
                    altText: ocrResult.fullText
                        ? ocrResult.fullText.substring(0, 500)
                        : null,
                },
            });
        }

        sendResponse(res, 200, { processedData: ocrResult }, 'OCR processing complete');
    } catch (error) {
        logger.error('processExisting error:', error.message);
        next(error);
    }
};

module.exports = {
    fullUpload,
    quickUploadHandler,
    batchUpload,
    processExisting,
};
