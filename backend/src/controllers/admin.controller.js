// ──────────────────────────────────────────────
//  Admin Management Controller
// ──────────────────────────────────────────────

const prisma = require('../config/database');
const { hashPassword, paginate, sendPaginatedResponse, sendResponse } = require('../utils/helpers');
const profileService = require('../services/profile.service');
const { createAuditLog } = require('../middleware/audit');

// GET /api/admin
const getAdmins = async (req, res, next) => {
    try {
        const { page, limit, skip } = paginate(req.query);
        const { role, cityId, search } = req.query;

        const where = {
            isStaffProfile: { not: true }
        };
        if (role) where.role = role;
        if (cityId) where.cityId = cityId;
        if (search) {
            where.OR = [
                { name: { contains: search, mode: 'insensitive' } },
                { email: { contains: search, mode: 'insensitive' } },
            ];
        }

        const [admins, total] = await Promise.all([
            prisma.admin.findMany({
                where,
                skip,
                take: limit,
                include: { city: { select: { name: true, code: true } } },
                orderBy: { createdAt: 'desc' },
            }),
            prisma.admin.count({ where }),
        ]);

        // Strip sensitive fields
        const safeAdmins = admins.map(({ passwordHash, refreshToken, ...rest }) => rest);
        sendPaginatedResponse(res, safeAdmins, total, page, limit);
    } catch (error) {
        next(error);
    }
};

// GET /api/admin/:id
const getAdminById = async (req, res, next) => {
    try {
        const admin = await prisma.admin.findUnique({
            where: { id: req.params.id },
            include: { city: { select: { name: true, code: true } } },
        });
        if (!admin) return res.status(404).json({ success: false, message: 'Admin not found' });

        const { passwordHash, refreshToken, ...safeAdmin } = admin;
        sendResponse(res, 200, safeAdmin);
    } catch (error) {
        next(error);
    }
};

// PUT /api/admin/:id
const updateAdmin = async (req, res, next) => {
    try {
        const { name, email, phone, role, cityId, isActive, documentsJson } = req.body;
        const oldAdmin = await prisma.admin.findUnique({ where: { id: req.params.id } });
        if (!oldAdmin) return res.status(404).json({ success: false, message: 'Admin not found' });

        const data = {};
        if (name !== undefined) data.name = name;
        if (email !== undefined) data.email = email;
        if (phone !== undefined) data.phone = phone;
        if (role !== undefined) data.role = role;
        if (cityId !== undefined) data.cityId = cityId;
        if (isActive !== undefined) data.isActive = isActive;
        if (documentsJson !== undefined) data.documentsJson = documentsJson;

        const admin = await prisma.admin.update({
            where: { id: req.params.id },
            data,
        });

        // Role/active-status changes are the most security-sensitive admin
        // action possible (privilege escalation, account deactivation) — the
        // generic auditMiddleware('Admin') at the route only logs
        // action/entityId, not what actually changed. Record it explicitly,
        // same pattern as the price/fee audit fix.
        if (oldAdmin.role !== admin.role || oldAdmin.isActive !== admin.isActive) {
            await createAuditLog({
                adminId: req.user?.id,
                action: 'ADMIN_ACCESS_CHANGED',
                entity: 'Admin',
                entityId: admin.id,
                oldValue: { role: oldAdmin.role, isActive: oldAdmin.isActive },
                newValue: { role: admin.role, isActive: admin.isActive },
                ipAddress: req.ip,
            });
        }

        const { passwordHash, refreshToken, ...safeAdmin } = admin;
        sendResponse(res, 200, safeAdmin, 'Admin updated successfully');
    } catch (error) {
        next(error);
    }
};

// PUT /api/admin/:id/password
const updateAdminPassword = async (req, res, next) => {
    try {
        const { password } = req.body;
        const passwordHash = await hashPassword(password);

        await prisma.admin.update({
            where: { id: req.params.id },
            data: { passwordHash },
        });

        sendResponse(res, 200, null, 'Password updated successfully');
    } catch (error) {
        next(error);
    }
};

// DELETE /api/admin/:id
const deleteAdmin = async (req, res, next) => {
    try {
        await prisma.admin.delete({ where: { id: req.params.id } });
        sendResponse(res, 200, null, 'Admin deleted successfully');
    } catch (error) {
        next(error);
    }
};

// GET /api/admin/profiles
const getProfiles = async (req, res, next) => {
    try {
        const { role, search, specialization, sortBy, order, page, limit } = req.query;
        const result = await profileService.getProfiles({
            role: role || 'management',
            search,
            specialization,
            sortBy,
            order,
            page: parseInt(page) || 1,
            limit: parseInt(limit) || 20
        });
        sendPaginatedResponse(res, result.data, result.total, parseInt(page) || 1, parseInt(limit) || 20);
    } catch (error) {
        next(error);
    }
};

// GET /api/admin/profiles/metadata
const getMetadata = async (req, res, next) => {
    try {
        const metadata = await profileService.getMetadata();
        sendResponse(res, 200, metadata);
    } catch (error) {
        next(error);
    }
};

/**
 * Update system metadata configuration
 * PUT /admin/profiles/metadata
 */
const updateMetadata = async (req, res, next) => {
    try {
        const data = await profileService.updateMetadata(req.body);
        sendResponse(res, 200, data, 'Staff metadata updated');
    } catch (error) {
        next(error);
    }
};

/**
 * Request GCS Signed URL for staff photo upload
 * POST /admin/profiles/upload-url
 */
const requestUploadUrl = async (req, res, next) => {
    try {
        const { fileName, contentType, folder = 'profiles' } = req.body;
        
        // Strict validation for staff photos
        if (!fileName || !contentType) {
            return res.status(400).json({ success: false, message: 'fileName and contentType required' });
        }
        
        // Allow both images and PDFs for staff profiles / verification documents
        const isImage = contentType.startsWith('image/');
        const isPdf = contentType === 'application/pdf';
        if (!isImage && !isPdf) {
            return res.status(400).json({ success: false, message: 'Only image and PDF uploads are allowed for staff profiles' });
        }

        const { getSignedUploadUrl } = require('../utils/storage.service');
        const data = await getSignedUploadUrl(folder, fileName, contentType);
        
        res.json({ success: true, data });
    } catch (error) {
        next(error);
    }
};

// POST /api/admin/profiles/bulk-status
const bulkUpdateStatus = async (req, res, next) => {
    try {
        const { ids, status, type } = req.body;
        const results = await profileService.bulkUpdateStatus(req.user.id, { ids, status, type });
        sendResponse(res, 200, results, `Successfully updated ${results.length} profiles`);
    } catch (error) {
        next(error);
    }
};

// POST /api/admin/profiles/bulk-delete
const bulkDelete = async (req, res, next) => {
    try {
        const { ids, type } = req.body;
        const result = await profileService.bulkDelete(req.user.id, { ids, type });
        sendResponse(res, 200, result, `Successfully deleted ${result.count} profiles`);
    } catch (error) {
        next(error);
    }
};

// DELETE /api/admin/profiles/:id
const deleteProfile = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { type } = req.query; // role/tab type
        const result = await profileService.deleteProfile(req.user.id, { id, type });
        if (!result) return res.status(404).json({ success: false, message: 'Profile not found' });
        sendResponse(res, 200, null, 'Profile deleted successfully');
    } catch (error) {
        next(error);
    }
};

// PUT /api/admin/profiles/:id
const updateProfile = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { type } = req.query;
        const result = await profileService.updateProfile(req.user.id, { id, type, data: req.body });
        if (!result) return res.status(404).json({ success: false, message: 'Profile not found' });
        sendResponse(res, 200, result, 'Profile updated successfully');
    } catch (error) {
        next(error);
    }
};

// POST /api/admin/profiles
const createProfile = async (req, res, next) => {
    try {
        const { type } = req.query; // role type
        const result = await profileService.createProfile(req.user.id, { type, data: req.body });
        sendResponse(res, 201, result, 'Profile created successfully');
    } catch (error) {
        if (error.code === 'P2002') {
            return res.status(400).json({ 
                success: false, 
                message: `Duplicate entry: A staff member with this ${error.meta.target.join('/')} already exists.` 
            });
        }
        next(error);
    }
};

module.exports = { 
    getAdmins, getAdminById, updateAdmin, updateAdminPassword, deleteAdmin,
    getProfiles, getMetadata, updateMetadata, requestUploadUrl, 
    bulkUpdateStatus, bulkDelete, deleteProfile, updateProfile, createProfile 
};
