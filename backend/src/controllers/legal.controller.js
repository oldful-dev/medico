// ──────────────────────────────────────────────
//  Legal CMS Controller
// ──────────────────────────────────────────────

const prisma = require('../config/database');
const { sendResponse } = require('../utils/helpers');
const { createAuditLog } = require('../middleware/audit');

// GET /api/legal
const getLegalDocuments = async (req, res, next) => {
    try {
        const { type, status } = req.query;
        const where = {};
        if (type) where.type = type;
        if (status) where.status = status;

        const docs = await prisma.legalDocument.findMany({
            where,
            orderBy: [{ type: 'asc' }, { version: 'desc' }],
        });
        sendResponse(res, 200, docs);
    } catch (error) {
        next(error);
    }
};

// GET /api/legal/:id
const getLegalDocumentById = async (req, res, next) => {
    try {
        const doc = await prisma.legalDocument.findUnique({ where: { id: req.params.id } });
        if (!doc) return res.status(404).json({ success: false, message: 'Document not found' });
        sendResponse(res, 200, doc);
    } catch (error) {
        next(error);
    }
};

// GET /api/legal/published  (Public — app users)
const getPublishedDocuments = async (req, res, next) => {
    try {
        const docs = await prisma.legalDocument.findMany({
            where: { status: 'PUBLISHED' },
            orderBy: [{ type: 'asc' }, { version: 'desc' }],
        });

        // Deduplicate by type (keep first one which is latest version because of ordering)
        const latestDocs = [];
        const seenTypes = new Set();
        for (const doc of docs) {
            if (!seenTypes.has(doc.type)) {
                seenTypes.add(doc.type);
                latestDocs.push(doc);
            }
        }

        sendResponse(res, 200, latestDocs);
    } catch (error) {
        next(error);
    }
};

// GET /api/legal/published/:type  (Public — app users)
const getPublishedDocument = async (req, res, next) => {
    try {
        const doc = await prisma.legalDocument.findFirst({
            where: { type: req.params.type, status: 'PUBLISHED' },
            orderBy: { version: 'desc' },
        });
        if (!doc) return res.status(404).json({ success: false, message: 'Document not found' });
        sendResponse(res, 200, doc);
    } catch (error) {
        next(error);
    }
};

// POST /api/legal
const createLegalDocument = async (req, res, next) => {
    try {
        const { type, title, content } = req.body;

        // Get latest version for this type
        const latest = await prisma.legalDocument.findFirst({
            where: { type },
            orderBy: { version: 'desc' },
        });

        const doc = await prisma.legalDocument.create({
            data: {
                type,
                title,
                content,
                version: latest ? latest.version + 1 : 1,
                editedBy: req.user?.id,
            },
        });

        sendResponse(res, 201, doc, 'Legal document created');
    } catch (error) {
        next(error);
    }
};

// PUT /api/legal/:id
const updateLegalDocument = async (req, res, next) => {
    try {
        const old = await prisma.legalDocument.findUnique({ where: { id: req.params.id } });

        const doc = await prisma.legalDocument.update({
            where: { id: req.params.id },
            data: { ...req.body, editedBy: req.user?.id },
        });

        if (req.user?.type === 'admin') {
            await createAuditLog({
                adminId: req.user.id,
                action: 'LEGAL_DOCUMENT_EDITED',
                entity: 'LegalDocument',
                entityId: doc.id,
                oldValue: { content: old.content?.substring(0, 200) },
                newValue: { content: doc.content?.substring(0, 200) },
                ipAddress: req.ip,
            });
        }

        sendResponse(res, 200, doc, 'Legal document updated');
    } catch (error) {
        next(error);
    }
};

// PUT /api/legal/:id/publish
const publishLegalDocument = async (req, res, next) => {
    try {
        // Unpublish previous version of same type
        const doc = await prisma.legalDocument.findUnique({ where: { id: req.params.id } });
        await prisma.legalDocument.updateMany({
            where: { type: doc.type, status: 'PUBLISHED' },
            data: { status: 'DRAFT' },
        });

        const published = await prisma.legalDocument.update({
            where: { id: req.params.id },
            data: { status: 'PUBLISHED', publishedAt: new Date() },
        });

        sendResponse(res, 200, published, 'Document published');
    } catch (error) {
        next(error);
    }
};

// DELETE /api/legal/:id  (drafts only)
const deleteLegalDocument = async (req, res, next) => {
    try {
        const doc = await prisma.legalDocument.findUnique({ where: { id: req.params.id } });
        if (!doc) return res.status(404).json({ success: false, message: 'Document not found' });
        if (doc.status === 'PUBLISHED') {
            return res.status(400).json({ success: false, message: 'Cannot delete a published document. Archive it first by publishing a newer version.' });
        }
        await prisma.legalDocument.delete({ where: { id: req.params.id } });
        sendResponse(res, 200, null, 'Document deleted');
    } catch (error) {
        next(error);
    }
};

module.exports = {
    getLegalDocuments, getLegalDocumentById, getPublishedDocument, getPublishedDocuments,
    createLegalDocument, updateLegalDocument, publishLegalDocument, deleteLegalDocument,
};
