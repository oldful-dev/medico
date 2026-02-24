// ──────────────────────────────────────────────
//  Server-Driven UI Config Controller
// ──────────────────────────────────────────────

const prisma = require('../config/database');
const { sendResponse } = require('../utils/helpers');

// GET /api/ui-config
const getUIConfigs = async (req, res, next) => {
    try {
        const { type, isVisible } = req.query;
        const where = {};
        if (type) where.type = type;
        if (isVisible !== undefined) where.isVisible = isVisible === 'true';

        const configs = await prisma.uIConfig.findMany({
            where,
            orderBy: { sortOrder: 'asc' },
        });
        sendResponse(res, 200, configs);
    } catch (error) {
        next(error);
    }
};

// GET /api/ui-config/published  (App-facing — only visible configs)
const getPublishedConfigs = async (req, res, next) => {
    try {
        const configs = await prisma.uIConfig.findMany({
            where: { isVisible: true },
            orderBy: { sortOrder: 'asc' },
        });
        sendResponse(res, 200, configs);
    } catch (error) {
        next(error);
    }
};

// GET /api/ui-config/:id
const getUIConfigById = async (req, res, next) => {
    try {
        const config = await prisma.uIConfig.findUnique({ where: { id: req.params.id } });
        if (!config) return res.status(404).json({ success: false, message: 'UI Config not found' });
        sendResponse(res, 200, config);
    } catch (error) {
        next(error);
    }
};

// POST /api/ui-config
const createUIConfig = async (req, res, next) => {
    try {
        const config = await prisma.uIConfig.create({ data: req.body });
        sendResponse(res, 201, config, 'UI Config created');
    } catch (error) {
        next(error);
    }
};

// PUT /api/ui-config/:id
const updateUIConfig = async (req, res, next) => {
    try {
        const config = await prisma.uIConfig.update({
            where: { id: req.params.id },
            data: req.body,
        });
        sendResponse(res, 200, config, 'UI Config updated');
    } catch (error) {
        next(error);
    }
};

// PUT /api/ui-config/:id/publish
const publishUIConfig = async (req, res, next) => {
    try {
        const config = await prisma.uIConfig.findUnique({ where: { id: req.params.id } });
        const updated = await prisma.uIConfig.update({
            where: { id: req.params.id },
            data: {
                isVisible: true,
                version: config.version + 1,
                publishedAt: new Date(),
            },
        });
        sendResponse(res, 200, updated, 'UI Config published');
    } catch (error) {
        next(error);
    }
};

// DELETE /api/ui-config/:id
const deleteUIConfig = async (req, res, next) => {
    try {
        await prisma.uIConfig.delete({ where: { id: req.params.id } });
        sendResponse(res, 200, null, 'UI Config deleted');
    } catch (error) {
        next(error);
    }
};

module.exports = {
    getUIConfigs, getPublishedConfigs, getUIConfigById,
    createUIConfig, updateUIConfig, publishUIConfig, deleteUIConfig,
};
