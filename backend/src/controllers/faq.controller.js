// ──────────────────────────────────────────────
//  FAQ Management Controller
// ──────────────────────────────────────────────

const prisma = require('../config/database');
const { sendResponse } = require('../utils/helpers');

// GET /api/faqs/published - Public endpoint for app/website FAQ sections
const getPublishedFAQs = async (req, res, next) => {
  try {
    const faqs = await prisma.fAQ.findMany({
      where: { isActive: true },
      orderBy: { order: 'asc' },
    });
    sendResponse(res, 200, faqs);
  } catch (error) {
    next(error);
  }
};

// GET /api/faqs/:id - Get single FAQ by ID
const getFAQById = async (req, res, next) => {
  try {
    const faq = await prisma.fAQ.findUnique({
      where: { id: req.params.id },
    });
    if (!faq) return res.status(404).json({ success: false, message: 'FAQ not found' });
    sendResponse(res, 200, faq);
  } catch (error) {
    next(error);
  }
};

// GET /api/faqs - Admin only: Get all FAQs (paginated)
const getAllFAQs = async (req, res, next) => {
  try {
    const { page = 1, limit = 20, isActive } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const where = {};
    if (isActive !== undefined) {
      where.isActive = isActive === 'true';
    }

    const [faqs, total] = await Promise.all([
      prisma.fAQ.findMany({
        where,
        orderBy: { order: 'asc' },
        skip,
        take: parseInt(limit),
      }),
      prisma.fAQ.count({ where }),
    ]);

    res.json({
      success: true,
      data: faqs,
      total,
      page: parseInt(page),
      limit: parseInt(limit),
      pages: Math.ceil(total / parseInt(limit)),
    });
  } catch (error) {
    next(error);
  }
};

// POST /api/faqs - Admin only: Create new FAQ
const createFAQ = async (req, res, next) => {
  try {
    const { question, answer, category, order, isActive } = req.body;

    if (!question || !answer) {
      return res.status(400).json({
        success: false,
        message: 'question and answer are required',
      });
    }

    const faq = await prisma.fAQ.create({
      data: {
        question,
        answer,
        category: category || 'GENERAL',
        order: order || 0,
        isActive: isActive !== undefined ? isActive : true,
      },
    });

    res.status(201).json({ success: true, data: faq });
  } catch (error) {
    next(error);
  }
};

// PUT /api/faqs/:id - Admin only: Update FAQ
const updateFAQ = async (req, res, next) => {
  try {
    const { question, answer, category, order, isActive } = req.body;

    const faq = await prisma.fAQ.findUnique({
      where: { id: req.params.id },
    });

    if (!faq) {
      return res.status(404).json({ success: false, message: 'FAQ not found' });
    }

    const updated = await prisma.fAQ.update({
      where: { id: req.params.id },
      data: {
        ...(question !== undefined && { question }),
        ...(answer !== undefined && { answer }),
        ...(category !== undefined && { category }),
        ...(order !== undefined && { order }),
        ...(isActive !== undefined && { isActive }),
      },
    });

    res.json({ success: true, data: updated });
  } catch (error) {
    next(error);
  }
};

// DELETE /api/faqs/:id - Admin only: Delete FAQ
const deleteFAQ = async (req, res, next) => {
  try {
    const faq = await prisma.fAQ.findUnique({
      where: { id: req.params.id },
    });

    if (!faq) {
      return res.status(404).json({ success: false, message: 'FAQ not found' });
    }

    await prisma.fAQ.delete({
      where: { id: req.params.id },
    });

    res.json({ success: true, message: 'FAQ deleted successfully' });
  } catch (error) {
    next(error);
  }
};

// PATCH /api/faqs/:id/toggle - Admin only: Toggle active status
const toggleFAQStatus = async (req, res, next) => {
  try {
    const { isActive } = req.body;

    if (isActive === undefined) {
      return res.status(400).json({ success: false, message: 'isActive is required' });
    }

    const faq = await prisma.fAQ.findUnique({
      where: { id: req.params.id },
    });

    if (!faq) {
      return res.status(404).json({ success: false, message: 'FAQ not found' });
    }

    const updated = await prisma.fAQ.update({
      where: { id: req.params.id },
      data: { isActive },
    });

    res.json({ success: true, data: updated });
  } catch (error) {
    next(error);
  }
};

// POST /api/faqs/reorder - Admin only: Reorder FAQs
const reorderFAQs = async (req, res, next) => {
  try {
    const { faqs } = req.body;

    if (!Array.isArray(faqs)) {
      return res.status(400).json({
        success: false,
        message: 'faqs array is required',
      });
    }

    await Promise.all(
      faqs.map(({ id, order }) =>
        prisma.fAQ.update({
          where: { id },
          data: { order },
        })
      )
    );

    res.json({ success: true, message: 'FAQs reordered successfully' });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getPublishedFAQs,
  getFAQById,
  getAllFAQs,
  createFAQ,
  updateFAQ,
  deleteFAQ,
  toggleFAQStatus,
  reorderFAQs,
};
