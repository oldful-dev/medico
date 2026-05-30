// ──────────────────────────────────────────────
//  Banner Management Controller
// ──────────────────────────────────────────────

const prisma = require('../config/database');
const { sendResponse } = require('../utils/helpers');

// GET /api/banners/home - Public endpoint for home screen banners
const getHomeBanners = async (req, res, next) => {
  try {
    const banners = await prisma.banner.findMany({
      where: { category: 'HOME', isActive: true },
      orderBy: { order: 'asc' },
    });
    sendResponse(res, 200, banners);
  } catch (error) {
    next(error);
  }
};

// GET /api/banners/:id - Get single banner by ID
const getBannerById = async (req, res, next) => {
  try {
    const banner = await prisma.banner.findUnique({
      where: { id: req.params.id },
    });
    if (!banner) return res.status(404).json({ success: false, message: 'Banner not found' });
    sendResponse(res, 200, banner);
  } catch (error) {
    next(error);
  }
};

// GET /api/banners - Admin only: Get all banners (paginated)
const getAllBanners = async (req, res, next) => {
  try {
    const { page = 1, limit = 10, isActive } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const where = {};
    if (isActive !== undefined) {
      where.isActive = isActive === 'true';
    }

    const [banners, total] = await Promise.all([
      prisma.banner.findMany({
        where,
        orderBy: { order: 'asc' },
        skip,
        take: parseInt(limit),
      }),
      prisma.banner.count({ where }),
    ]);

    res.json({
      success: true,
      data: banners,
      total,
      page: parseInt(page),
      limit: parseInt(limit),
      pages: Math.ceil(total / parseInt(limit)),
    });
  } catch (error) {
    next(error);
  }
};

// POST /api/banners - Admin only: Create new banner
const createBanner = async (req, res, next) => {
  try {
    const { imageUrl, heading, subheading, ctaText, ctaRoute, category, order, isActive } = req.body;

    if (!imageUrl || !heading || !subheading) {
      return res.status(400).json({
        success: false,
        message: 'imageUrl, heading, and subheading are required',
      });
    }

    const banner = await prisma.banner.create({
      data: {
        imageUrl,
        heading,
        subheading,
        ctaText: ctaText || null,
        ctaRoute: ctaRoute || null,
        category: category || 'HOME',
        order: order || 0,
        isActive: isActive !== undefined ? isActive : true,
      },
    });

    res.status(201).json({ success: true, data: banner });
  } catch (error) {
    next(error);
  }
};

// PUT /api/banners/:id - Admin only: Update banner
const updateBanner = async (req, res, next) => {
  try {
    const { imageUrl, heading, subheading, ctaText, ctaRoute, category, order, isActive } = req.body;

    const banner = await prisma.banner.findUnique({
      where: { id: req.params.id },
    });

    if (!banner) {
      return res.status(404).json({ success: false, message: 'Banner not found' });
    }

    const updated = await prisma.banner.update({
      where: { id: req.params.id },
      data: {
        ...(imageUrl && { imageUrl }),
        ...(heading && { heading }),
        ...(subheading && { subheading }),
        ...(ctaText !== undefined && { ctaText: ctaText || null }),
        ...(ctaRoute !== undefined && { ctaRoute: ctaRoute || null }),
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

// DELETE /api/banners/:id - Admin only: Delete banner
const deleteBanner = async (req, res, next) => {
  try {
    const banner = await prisma.banner.findUnique({
      where: { id: req.params.id },
    });

    if (!banner) {
      return res.status(404).json({ success: false, message: 'Banner not found' });
    }

    await prisma.banner.delete({
      where: { id: req.params.id },
    });

    res.json({ success: true, message: 'Banner deleted successfully' });
  } catch (error) {
    next(error);
  }
};

// PATCH /api/banners/:id/toggle - Admin only: Toggle active status
const toggleBannerStatus = async (req, res, next) => {
  try {
    const { isActive } = req.body;

    if (isActive === undefined) {
      return res.status(400).json({ success: false, message: 'isActive is required' });
    }

    const banner = await prisma.banner.findUnique({
      where: { id: req.params.id },
    });

    if (!banner) {
      return res.status(404).json({ success: false, message: 'Banner not found' });
    }

    const updated = await prisma.banner.update({
      where: { id: req.params.id },
      data: { isActive },
    });

    res.json({ success: true, data: updated });
  } catch (error) {
    next(error);
  }
};

// POST /api/banners/reorder - Admin only: Reorder banners
const reorderBanners = async (req, res, next) => {
  try {
    const { banners } = req.body;

    if (!Array.isArray(banners)) {
      return res.status(400).json({
        success: false,
        message: 'banners array is required',
      });
    }

    // Update each banner's order
    await Promise.all(
      banners.map(({ id, order }) =>
        prisma.banner.update({
          where: { id },
          data: { order },
        })
      )
    );

    res.json({ success: true, message: 'Banners reordered successfully' });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getHomeBanners,
  getBannerById,
  getAllBanners,
  createBanner,
  updateBanner,
  deleteBanner,
  toggleBannerStatus,
  reorderBanners,
};
