// ──────────────────────────────────────────────
//  User Management Controller
// ──────────────────────────────────────────────

const prisma = require('../config/database');
const { sendResponse, sendPaginatedResponse, paginate, generateUserId } = require('../utils/helpers');
const { sendWelcomeNotifications } = require('../utils/notifications');
const { generateWelcomeSLAPDF } = require('../utils/pdfGenerator');
const { uploadToCloudinary } = require('../utils/fileUpload');
const { createAuditLog } = require('../middleware/audit');

// GET /api/users
const getUsers = async (req, res, next) => {
    try {
        const { page, limit, skip } = paginate(req.query);
        const { cityId, status, healthTag, search, planId } = req.query;

        const where = {};
        if (req.cityFilter) where.cityId = req.cityFilter; // RBAC city restriction
        if (cityId) where.cityId = cityId;
        if (status) where.status = status;
        if (healthTag) where.healthTag = healthTag;
        if (search) {
            where.OR = [
                { name: { contains: search, mode: 'insensitive' } },
                { uniqueUserId: { contains: search, mode: 'insensitive' } },
                { phone: { contains: search } },
                { email: { contains: search, mode: 'insensitive' } },
            ];
        }

        const [users, total] = await Promise.all([
            prisma.user.findMany({
                where,
                skip,
                take: limit,
                include: {
                    city: { select: { name: true, code: true } },
                    emergencyContacts: true,
                    subscriptions: {
                        where: { status: 'ACTIVE' },
                        include: { plan: { select: { name: true } } },
                        take: 1,
                    },
                    _count: { select: { bookings: true, healthReports: true } },
                },
                orderBy: { createdAt: 'desc' },
            }),
            prisma.user.count({ where }),
        ]);

        // Strip sensitive data
        const safeUsers = users.map(({ otpCode, otpExpiresAt, refreshToken, ...rest }) => rest);
        sendPaginatedResponse(res, safeUsers, total, page, limit);
    } catch (error) {
        next(error);
    }
};

// GET /api/users/:id
const getUserById = async (req, res, next) => {
    try {
        const user = await prisma.user.findUnique({
            where: { id: req.params.id },
            include: {
                city: true,
                addresses: true,
                emergencyContacts: true,
                medicalCards: true,
                healthReports: { orderBy: { reportDate: 'desc' } },
                subscriptions: {
                    include: { plan: true },
                    orderBy: { createdAt: 'desc' },
                },
                bookings: {
                    take: 10,
                    orderBy: { createdAt: 'desc' },
                    include: { service: { select: { name: true } } },
                },
                _count: { select: { bookings: true, payments: true, sosAlerts: true } },
            },
        });

        if (!user) return res.status(404).json({ success: false, message: 'User not found' });

        const { otpCode, otpExpiresAt, refreshToken, ...safeUser } = user;
        sendResponse(res, 200, safeUser);
    } catch (error) {
        next(error);
    }
};

// POST /api/users  (Admin creates user OR post-OTP registration)
const createUser = async (req, res, next) => {
    try {
        const { name, phone, email, gender, dateOfBirth, cityId, preferredLanguage } = req.body;

        const uniqueUserId = await generateUserId(cityId);

        const user = await prisma.user.create({
            data: {
                uniqueUserId,
                name,
                phone,
                email,
                gender,
                dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : null,
                cityId,
                preferredLanguage: preferredLanguage || 'en',
            },
            include: { city: { select: { name: true, code: true } } },
        });

        // Generate Welcome SLA PDF
        try {
            const pdfBuffer = await generateWelcomeSLAPDF({
                uniqueUserId: user.uniqueUserId,
                name: user.name,
                phone: user.phone,
                cityName: user.city.name,
            });

            const { url } = await uploadToCloudinary(pdfBuffer, 'sla-documents', 'raw');
            // Could store this URL on the user or send via email
        } catch (pdfError) {
            // Non-blocking — don't fail user creation
            console.error('SLA PDF generation failed:', pdfError);
        }

        // Send welcome notifications
        sendWelcomeNotifications(user).catch(() => { }); // non-blocking

        // Generate tokens for app registration flow
        const { generateAccessToken, generateRefreshToken } = require('../utils/helpers');
        const payload = { id: user.id, type: 'user' };
        const accessToken = generateAccessToken(payload);
        const refreshToken = generateRefreshToken(payload);

        await prisma.user.update({
            where: { id: user.id },
            data: { refreshToken },
        });

        const { otpCode, otpExpiresAt, ...safeUser } = user;
        sendResponse(res, 201, {
            ...safeUser,
            accessToken,
            refreshToken,
        }, 'User created successfully');
    } catch (error) {
        next(error);
    }
};

// PUT /api/users/:id
const updateUser = async (req, res, next) => {
    try {
        const { name, email, gender, dateOfBirth, preferredLanguage, healthTag, status } = req.body;
        const data = {};
        if (name !== undefined) data.name = name;
        if (email !== undefined) data.email = email;
        if (gender !== undefined) data.gender = gender;
        if (dateOfBirth !== undefined) data.dateOfBirth = dateOfBirth ? new Date(dateOfBirth) : null;
        if (preferredLanguage !== undefined) data.preferredLanguage = preferredLanguage;
        if (healthTag !== undefined) data.healthTag = healthTag;
        if (status !== undefined) data.status = status;

        const user = await prisma.user.update({
            where: { id: req.params.id },
            data,
        });

        const { otpCode, otpExpiresAt, refreshToken, ...safeUser } = user;
        sendResponse(res, 200, safeUser, 'User updated successfully');
    } catch (error) {
        next(error);
    }
};

// PUT /api/users/:id/block
const blockUser = async (req, res, next) => {
    try {
        const user = await prisma.user.update({
            where: { id: req.params.id },
            data: { status: 'BLOCKED' },
        });

        if (req.user?.type === 'admin') {
            await createAuditLog({
                adminId: req.user.id,
                action: 'USER_BLOCKED',
                entity: 'User',
                entityId: user.id,
                ipAddress: req.ip,
            });
        }

        sendResponse(res, 200, null, 'User blocked successfully');
    } catch (error) {
        next(error);
    }
};

// PUT /api/users/:id/suspend
const suspendUser = async (req, res, next) => {
    try {
        await prisma.user.update({
            where: { id: req.params.id },
            data: { status: 'SUSPENDED' },
        });
        sendResponse(res, 200, null, 'User suspended successfully');
    } catch (error) {
        next(error);
    }
};

// PUT /api/users/:id/activate
const activateUser = async (req, res, next) => {
    try {
        await prisma.user.update({
            where: { id: req.params.id },
            data: { status: 'ACTIVE' },
        });
        sendResponse(res, 200, null, 'User activated successfully');
    } catch (error) {
        next(error);
    }
};

// ─── Emergency Contacts ────────────────────

// POST /api/users/:id/emergency-contacts
const addEmergencyContact = async (req, res, next) => {
    try {
        const { name, phone, relationship } = req.body;
        const contact = await prisma.emergencyContact.create({
            data: { userId: req.params.id, name, phone, relationship },
        });
        sendResponse(res, 201, contact, 'Emergency contact added');
    } catch (error) {
        next(error);
    }
};

// DELETE /api/users/:userId/emergency-contacts/:contactId
const removeEmergencyContact = async (req, res, next) => {
    try {
        await prisma.emergencyContact.delete({ where: { id: req.params.contactId } });
        sendResponse(res, 200, null, 'Emergency contact removed');
    } catch (error) {
        next(error);
    }
};

// ─── Address Management ────────────────────

// POST /api/users/:id/addresses
const addAddress = async (req, res, next) => {
    try {
        const address = await prisma.address.create({
            data: { userId: req.params.id, ...req.body },
        });
        sendResponse(res, 201, address, 'Address added');
    } catch (error) {
        next(error);
    }
};

// PUT /api/users/:userId/addresses/:addressId
const updateAddress = async (req, res, next) => {
    try {
        const address = await prisma.address.update({
            where: { id: req.params.addressId },
            data: req.body,
        });
        sendResponse(res, 200, address, 'Address updated');
    } catch (error) {
        next(error);
    }
};

// ─── Medical Card ──────────────────────────

// POST /api/users/:id/medical-card
const upsertMedicalCard = async (req, res, next) => {
    try {
        const { bloodGroup, allergies, chronicConditions, currentMedications } = req.body;

        const existing = await prisma.medicalCard.findFirst({ where: { userId: req.params.id } });

        let card;
        if (existing) {
            card = await prisma.medicalCard.update({
                where: { id: existing.id },
                data: { bloodGroup, allergies, chronicConditions, currentMedications, lastUpdated: new Date() },
            });
        } else {
            card = await prisma.medicalCard.create({
                data: { userId: req.params.id, bloodGroup, allergies, chronicConditions, currentMedications },
            });
        }

        sendResponse(res, 200, card, 'Medical card updated');
    } catch (error) {
        next(error);
    }
};

// ─── Health Reports ────────────────────────

// POST /api/users/:id/health-reports (file upload)
const uploadHealthReport = async (req, res, next) => {
    try {
        if (!req.file) return res.status(400).json({ success: false, message: 'File required' });

        const { url } = await uploadToCloudinary(req.file.buffer, 'health-reports');

        const report = await prisma.healthReport.create({
            data: {
                userId: req.params.id,
                title: req.body.title || req.file.originalname,
                fileUrl: url,
                fileType: req.file.mimetype.split('/')[1],
                uploadedBy: req.user?.type || 'user',
                flagSeverity: req.body.flagSeverity || null,
                flagNote: req.body.flagNote || null,
            },
        });

        sendResponse(res, 201, report, 'Health report uploaded');
    } catch (error) {
        next(error);
    }
};

// GET /api/users/profile  (App user — get own profile)
const getMyProfile = async (req, res, next) => {
    try {
        const user = await prisma.user.findUnique({
            where: { id: req.user.id },
            include: {
                city: { select: { name: true, code: true } },
                addresses: true,
                emergencyContacts: true,
                medicalCards: true,
                subscriptions: {
                    where: { status: 'ACTIVE' },
                    include: { plan: true },
                    take: 1,
                },
            },
        });

        const { otpCode, otpExpiresAt, refreshToken, ...safeUser } = user;
        sendResponse(res, 200, safeUser);
    } catch (error) {
        next(error);
    }
};

// PUT /api/users/profile  (App user — update own profile)
const updateMyProfile = async (req, res, next) => {
    try {
        const { name, email, gender, dateOfBirth, preferredLanguage } = req.body;
        const data = {};
        if (name) data.name = name;
        if (email) data.email = email;
        if (gender) data.gender = gender;
        if (dateOfBirth) data.dateOfBirth = new Date(dateOfBirth);
        if (preferredLanguage) data.preferredLanguage = preferredLanguage;

        const user = await prisma.user.update({
            where: { id: req.user.id },
            data,
        });

        const { otpCode, otpExpiresAt, refreshToken, ...safeUser } = user;
        sendResponse(res, 200, safeUser, 'Profile updated');
    } catch (error) {
        next(error);
    }
};

module.exports = {
    getUsers, getUserById, createUser, updateUser,
    blockUser, suspendUser, activateUser,
    addEmergencyContact, removeEmergencyContact,
    addAddress, updateAddress,
    upsertMedicalCard, uploadHealthReport,
    getMyProfile, updateMyProfile,
};
