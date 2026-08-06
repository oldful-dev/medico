const prisma = require('../config/database');
const { paginate, sendResponse, sendPaginatedResponse, generateUserId } = require('../utils/helpers');
const { sendWelcomeNotifications } = require('../utils/notifications');
const { generateWelcomeSLAPDF } = require('../utils/pdfGenerator');
const { uploadFile, toCDNUrl } = require('../utils/storage.service');
const { analyzeMedicalReportFromGCS, analyzeMedicalReportFromBuffer } = require('../utils/ocr.service');
const { createAuditLog } = require('../middleware/audit');
const { logger } = require('../config/logger');

// Transform GCS URL to CDN URL for profile images
const transformProfileImageToCDN = (url) => {
    if (!url) return url;
    const gcsBase = `https://storage.googleapis.com/${process.env.GOOGLE_STORAGE_BUCKET_NAME || 'ayuxa-assets'}/`;
    if (url.startsWith(gcsBase)) {
        const storagePath = url.split('?')[0].replace(gcsBase, ''); // Remove base URL and query params
        const cdnUrl = toCDNUrl(storagePath, 'profile-avatars');
        if (cdnUrl) {
            // Add back query params (like ?v=timestamp for cache busting)
            const queryPart = url.includes('?') ? url.substring(url.indexOf('?')) : '';
            return cdnUrl + queryPart;
        }
    }
    return url;
};

// Helper to format deleted user PII cleanly for admin console
const formatDeletedPII = (user) => {
    if (!user) return user;
    if (user.status === 'DELETED') {
        if (user.phone && user.phone.startsWith('deleted_')) {
            const parts = user.phone.split('_');
            if (parts.length >= 3) {
                user.phone = parts.slice(2).join('_');
            }
        }
        if (user.email && user.email.startsWith('deleted_')) {
            const parts = user.email.split('_');
            if (parts.length >= 3) {
                user.email = parts.slice(2).join('_');
            }
        }
    }
    return user;
};

// GET /api/users
const getUsers = async (req, res, next) => {
    try {
        const { page, limit, skip } = paginate(req.query);
        const { cityId, status, healthTag, search, planId } = req.query;

        const where = {};
        if (req.cityFilter) {
            where.cityId = req.cityFilter;
        } else if (cityId) {
            where.cityId = cityId;
        }
        if (status) where.status = status;
        if (healthTag) where.healthTag = healthTag;
        if (search) {
            where.OR = [
                { name: { contains: search, mode: 'insensitive' } },
                { uniqueUserId: { contains: search, mode: 'insensitive' } },
                { phone: { contains: search } },
                { email: { contains: search, mode: 'insensitive' } },
                { phone: { contains: `_${search}` } },
                { email: { contains: `_${search}`, mode: 'insensitive' } },
            ];
        }

        const orderBy = status === 'ACTIVE' ? { name: 'asc' } : { createdAt: 'desc' };

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
                orderBy,
            }),
            prisma.user.count({ where }),
        ]);

        // Strip sensitive data and format deleted users for admin display
        const safeUsers = users.map(({ otpCode, otpExpiresAt, refreshToken, ...rest }) => formatDeletedPII(rest));

        if (status === 'DELETED') {
            const allDeletedUsers = await prisma.user.findMany({
                where: { status: 'DELETED' },
                select: {
                    bookings: {
                        select: {
                            amount: true
                        }
                    }
                }
            });
            let totalFees = 0;
            let totalBookings = 0;
            allDeletedUsers.forEach(u => {
                totalBookings += u.bookings.length;
                u.bookings.forEach(b => {
                    totalFees += b.amount || 0;
                });
            });
            return res.json({
                success: true,
                data: safeUsers,
                archiveMetrics: {
                    totalBookings,
                    totalFees
                },
                pagination: {
                    total,
                    page,
                    limit,
                    totalPages: Math.ceil(total / limit),
                    hasMore: page * limit < total,
                }
            });
        }

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
                familyMembers: true,
                medicalCards: true,
                healthReports: { orderBy: { reportDate: 'desc' } },
                subscriptions: {
                    include: { plan: true },
                    orderBy: { createdAt: 'desc' },
                },
                bookings: {
                    take: 50,
                    orderBy: { createdAt: 'desc' },
                    include: { service: { select: { name: true } } },
                },
                labOrders: {
                    take: 50,
                    orderBy: { createdAt: 'desc' }
                },
                productOrders: {
                    take: 50,
                    orderBy: { createdAt: 'desc' },
                    include: { product: true }
                },
                sosAlerts: {
                    take: 50,
                    orderBy: { createdAt: 'desc' }
                },
                payments: {
                    take: 50,
                    orderBy: { createdAt: 'desc' },
                    include: { invoice: { select: { invoiceNumber: true, pdfUrl: true } } }
                },
                insuranceApps: {
                    take: 50,
                    orderBy: { createdAt: 'desc' }
                },
                meetupRegistrations: {
                    take: 50,
                    include: { meetup: true },
                    orderBy: { createdAt: 'desc' }
                },
                _count: { select: { bookings: true, payments: true, sosAlerts: true, labOrders: true, productOrders: true } },
            },
        });

        if (!user) return res.status(404).json({ success: false, message: 'User not found' });

        const { otpCode, otpExpiresAt, refreshToken, ...safeUser } = user;

        // Dynamically sign health report private download URLs
        if (safeUser.healthReports && safeUser.healthReports.length > 0) {
            const { getSignedDownloadUrl } = require('../utils/storage.service');
            safeUser.healthReports = await Promise.all(safeUser.healthReports.map(async (report) => {
                let signedUrl = report.fileUrl;
                if (report.fileUrl) {
                    let pathKey = report.fileUrl;
                    if (report.fileUrl.startsWith('http://') || report.fileUrl.startsWith('https://')) {
                        const urlObj = new URL(report.fileUrl);
                        const bucketName = process.env.GOOGLE_STORAGE_BUCKET_NAME || 'ayuxa-assets';
                        const prefix = `/${bucketName}/`;
                        if (urlObj.pathname.startsWith(prefix)) {
                            pathKey = urlObj.pathname.replace(prefix, '');
                        } else {
                            pathKey = urlObj.pathname.substring(1);
                        }
                    }
                    try {
                        const freshUrl = await getSignedDownloadUrl(pathKey);
                        if (freshUrl) signedUrl = freshUrl;
                    } catch (signErr) {
                        console.error('Failed to dynamically sign report url in admin user details:', signErr.message);
                    }
                }
                return { ...report, fileUrl: signedUrl };
            }));
        }

        sendResponse(res, 200, formatDeletedPII(safeUser));
    } catch (error) {
        next(error);
    }
};

// POST /api/users  (Admin creates user OR post-OTP registration)
const createUser = async (req, res, next) => {
    try {
        const { name, phone, email, gender, dateOfBirth, cityId, preferredLanguage, profileImageUrl, emergencyNumber, flatNumber, addressLine, line1, line2 } = req.body;

        if (!name || name.trim().length < 3) return sendResponse(res, 400, null, 'name is required (min 3 characters)');
        if (!phone) return sendResponse(res, 400, null, 'phone is required');
        if (!cityId) return sendResponse(res, 400, null, 'cityId is required');

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
                profileImageUrl: profileImageUrl || null,
            },
            include: { city: { select: { name: true, code: true } } },
        });

        // Create default address if provided during registration
        const finalLine1 = line1 || flatNumber || '';
        const finalLine2 = line2 || addressLine || '';

        if (finalLine2) {
            try {
                await prisma.address.create({
                    data: {
                        userId: user.id,
                        label: 'Home',
                        line1: finalLine1,
                        line2: finalLine2,
                        cityName: user.city.name,
                        state: '',
                        pincode: '',
                        isDefault: true,
                    },
                });
            } catch (addrErr) {
                console.error('Address creation during registration failed:', addrErr);
            }
        }

        // Create emergency contact if provided
        if (emergencyNumber) {
            try {
                await prisma.emergencyContact.create({
                    data: {
                        userId: user.id,
                        name: 'Emergency',
                        phone: emergencyNumber,
                        relationship: 'Other',
                    },
                });
            } catch (ecErr) {
                console.error('Emergency contact creation during registration failed:', ecErr);
            }
        }

        // Generate Welcome SLA PDF
        try {
            const pdfBuffer = await generateWelcomeSLAPDF({
                uniqueUserId: user.uniqueUserId,
                name: user.name,
                phone: user.phone,
                cityName: user.city.name,
            });

            const { url } = await uploadFile(pdfBuffer, 'sla-documents', 'sla.pdf');
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
        const targetUser = await prisma.user.findUnique({ where: { id: req.params.id } });
        if (targetUser && targetUser.status === 'DELETED') {
            return res.status(403).json({ success: false, message: 'This account has been deleted. Deleted user records are locked for compliance and cannot be modified.' });
        }

        const { name, email, phone, cityId, gender, dateOfBirth, preferredLanguage, healthTag, status, pushEnabled, smsEnabled, whatsappEnabled, emailMarketingEnabled } = req.body;

        // Strict Rule: Only Super Admin can add, remove, or update a user's mobile number and email address
        if ((email !== undefined || phone !== undefined) && req.user?.role !== 'SUPER_ADMIN') {
            return res.status(403).json({
                success: false,
                message: "Only Super Admin can add, remove, or update a user's mobile number and email address.",
            });
        }

        const data = {};
        if (name !== undefined) data.name = name;
        if (email !== undefined) data.email = email;
        
        if (phone !== undefined) {
            // Check if phone number is already taken by another user
            const existingUser = await prisma.user.findFirst({
                where: {
                    phone,
                    NOT: { id: req.params.id }
                }
            });
            if (existingUser) {
                return res.status(400).json({ success: false, message: 'Phone number already registered' });
            }
            data.phone = phone;
        }

        if (cityId !== undefined) data.cityId = cityId;
        if (gender !== undefined) data.gender = gender;
        if (dateOfBirth !== undefined) data.dateOfBirth = dateOfBirth ? new Date(dateOfBirth) : null;
        if (preferredLanguage !== undefined) data.preferredLanguage = preferredLanguage;
        if (healthTag !== undefined) data.healthTag = healthTag;
        if (status !== undefined) data.status = status;
        if (pushEnabled !== undefined) data.pushEnabled = pushEnabled;
        if (smsEnabled !== undefined) data.smsEnabled = smsEnabled;
        if (whatsappEnabled !== undefined) data.whatsappEnabled = whatsappEnabled;
        if (emailMarketingEnabled !== undefined) data.emailMarketingEnabled = emailMarketingEnabled;

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
        const { label, line1, line2, flatNumber, addressLine, cityName, state, pincode, landmark, isDefault, latitude, longitude } = req.body;

        const address = await prisma.address.create({
            data: {
                userId: req.params.id,
                label: label || 'Home',
                line1: line1 || flatNumber || '',
                line2: line2 || addressLine || '',
                cityName: cityName || '',
                state: state || '',
                pincode: pincode || '',
                landmark: landmark || null,
                isDefault: !!isDefault,
                latitude: latitude ? parseFloat(latitude) : null,
                longitude: longitude ? parseFloat(longitude) : null,
            },
        });
        sendResponse(res, 201, address, 'Address added');
    } catch (error) {
        next(error);
    }
};

// PUT /api/users/:userId/addresses/:addressId
const updateAddress = async (req, res, next) => {
    try {
        const { label, line1, line2, flatNumber, addressLine, cityName, state, pincode, landmark, isDefault, latitude, longitude } = req.body;
        
        const data = {};
        if (label !== undefined) data.label = label;
        if (line1 !== undefined) data.line1 = line1;
        if (line2 !== undefined) data.line2 = line2;
        if (flatNumber !== undefined && line1 === undefined) data.line1 = flatNumber;
        if (addressLine !== undefined && line2 === undefined) data.line2 = addressLine;
        if (cityName !== undefined) data.cityName = cityName;
        if (state !== undefined) data.state = state;
        if (pincode !== undefined) data.pincode = pincode;
        if (landmark !== undefined) data.landmark = landmark;
        if (isDefault !== undefined) data.isDefault = !!isDefault;
        if (latitude !== undefined) data.latitude = parseFloat(latitude);
        if (longitude !== undefined) data.longitude = parseFloat(longitude);

        const address = await prisma.address.update({
            where: { id: req.params.addressId },
            data,
        });
        sendResponse(res, 200, address, 'Address updated');
    } catch (error) {
        next(error);
    }
};

// DELETE /api/users/:userId/addresses/:addressId
const deleteAddress = async (req, res, next) => {
    try {
        await prisma.address.delete({ where: { id: req.params.addressId } });
        sendResponse(res, 200, null, 'Address deleted');
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

        const { url, gcsUri } = await uploadFile(req.file.buffer, 'health-reports', req.file.originalname, req.file, req.params.id);

        // Create the report record immediately (no waiting for OCR)
        const report = await prisma.healthReport.create({
            data: {
                userId: req.params.id,
                title: req.body.title || req.file.originalname,
                fileUrl: url,
                fileType: req.file.mimetype.split('/')[1],
                uploadedBy: req.user?.id || null,
                category: req.body.category || 'Other',
            },
        });

        // Respond immediately — OCR runs in background
        sendResponse(res, 201, report, 'Health report uploaded');

        // ── Background OCR (non-blocking) ────────────────────
        // This runs after the response is sent. If it fails, the report
        // is still saved — OCR results can be retried later.
        (async () => {
            try {
                // Mark as processing
                await prisma.healthReport.update({
                    where: { id: report.id },
                    data: { ocrStatus: 'processing' },
                });

                const ocrResult = gcsUri
                    ? await analyzeMedicalReportFromGCS(gcsUri)
                    : await analyzeMedicalReportFromBuffer(req.file.buffer);

                // Store all OCR results
                await prisma.healthReport.update({
                    where: { id: report.id },
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

                // Update user health tags
                if (ocrResult.healthTags?.length > 0) {
                    const user = await prisma.user.findUnique({ where: { id: req.params.id } });
                    let newTag = user?.healthTag || 'NORMAL';
                    if (ocrResult.healthTags.includes('DIABETIC') && newTag === 'NORMAL') {
                        newTag = 'DIABETIC';
                    } else if (ocrResult.healthTags.includes('HYPERTENSION') && newTag === 'NORMAL') {
                        newTag = 'HYPERTENSION';
                    }
                    if (user && newTag !== user.healthTag) {
                        await prisma.user.update({
                            where: { id: req.params.id },
                            data: { healthTag: newTag },
                        });
                    }
                }

                console.log(`OCR completed for report ${report.id}: ${ocrResult.valueCount} values, ${ocrResult.flagCount} flags`);
            } catch (ocrErr) {
                // Mark as failed so it can be retried
                await prisma.healthReport.update({
                    where: { id: report.id },
                    data: { ocrStatus: 'failed', flagNote: `OCR failed: ${ocrErr.message}` },
                }).catch(() => {}); // Don't throw if this update also fails
                console.error(`Background OCR failed for report ${report.id}:`, ocrErr.message);
            }
        })();

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
                healthReports: { orderBy: { createdAt: 'desc' } },
                subscriptions: {
                    where: { status: 'ACTIVE' },
                    include: { plan: true },
                },
            },
        });

        const { otpCode, otpExpiresAt, refreshToken, ...safeUser } = user;

        // Transform profile image URL from GCS to CDN
        if (safeUser.profileImageUrl) {
            safeUser.profileImageUrl = transformProfileImageToCDN(safeUser.profileImageUrl);
        }

        // Dynamically sign health report private download URLs
        if (safeUser.healthReports && safeUser.healthReports.length > 0) {
            const { getSignedDownloadUrl } = require('../utils/storage.service');
            safeUser.healthReports = await Promise.all(safeUser.healthReports.map(async (report) => {
                let signedUrl = report.fileUrl;
                if (report.fileUrl) {
                    let pathKey = report.fileUrl;
                    if (report.fileUrl.startsWith('http://') || report.fileUrl.startsWith('https://')) {
                        const urlObj = new URL(report.fileUrl);
                        const bucketName = process.env.GOOGLE_STORAGE_BUCKET_NAME || 'ayuxa-assets';
                        const prefix = `/${bucketName}/`;
                        if (urlObj.pathname.startsWith(prefix)) {
                            pathKey = urlObj.pathname.replace(prefix, '');
                        } else {
                            pathKey = urlObj.pathname.substring(1);
                        }
                    }
                    try {
                        const freshUrl = await getSignedDownloadUrl(pathKey);
                        if (freshUrl) signedUrl = freshUrl;
                    } catch (signErr) {
                        console.error('Failed to dynamically sign report url in profile:', signErr.message);
                    }
                }
                return { ...report, fileUrl: signedUrl };
            }));
        }

        sendResponse(res, 200, safeUser);
    } catch (error) {
        next(error);
    }
};

// PUT /api/users/profile  (App user — update own profile)
const updateMyProfile = async (req, res, next) => {
    try {
        if (req.body.email !== undefined || req.body.phone !== undefined) {
            return res.status(403).json({
                success: false,
                message: 'Users are not allowed to change their registered mobile number or email address. Please contact Super Admin.',
            });
        }

        const { name, gender, dateOfBirth, preferredLanguage, profileImageUrl, pushEnabled, smsEnabled, whatsappEnabled, emailMarketingEnabled } = req.body;
        const data = {};
        if (name !== undefined) data.name = name;
        if (gender !== undefined) data.gender = gender;
        if (dateOfBirth !== undefined) data.dateOfBirth = dateOfBirth ? new Date(dateOfBirth) : null;
        if (preferredLanguage !== undefined) data.preferredLanguage = preferredLanguage;
        if (profileImageUrl !== undefined) data.profileImageUrl = profileImageUrl;
        if (pushEnabled !== undefined) data.pushEnabled = pushEnabled;
        if (smsEnabled !== undefined) data.smsEnabled = smsEnabled;
        if (whatsappEnabled !== undefined) data.whatsappEnabled = whatsappEnabled;
        if (emailMarketingEnabled !== undefined) data.emailMarketingEnabled = emailMarketingEnabled;

        const user = await prisma.user.update({
            where: { id: req.user.id },
            data,
        });

        const { otpCode, otpExpiresAt, refreshToken, ...safeUser } = user;

        // Transform profile image URL from GCS to CDN in response
        if (safeUser.profileImageUrl) {
            safeUser.profileImageUrl = transformProfileImageToCDN(safeUser.profileImageUrl);
        }

        sendResponse(res, 200, safeUser, 'Profile updated');
    } catch (error) {
        next(error);
    }
};

// GET /api/users/profile/health-reports  (App user — list own reports)
const getMyHealthReports = async (req, res, next) => {
    try {
        const reports = await prisma.healthReport.findMany({
            where: { userId: req.user.id },
            orderBy: { createdAt: 'desc' },
        });

        // Dynamically sign fileUrl values so they don't expire in the DB
        const { getSignedDownloadUrl } = require('../utils/storage.service');
        const signedReports = await Promise.all(reports.map(async (report) => {
            // If the saved URL is a GCS signed URL (contains signature query params) or a storage path, re-sign it dynamically.
            let signedUrl = report.fileUrl;
            if (report.fileUrl) {
                // If it's a full URL, extract the storage path key
                let pathKey = report.fileUrl;
                if (report.fileUrl.startsWith('http://') || report.fileUrl.startsWith('https://')) {
                    const urlObj = new URL(report.fileUrl);
                    // Decouple GCS bucket prefix to find pure storagePath
                    const bucketName = process.env.GOOGLE_STORAGE_BUCKET_NAME || 'ayuxa-assets';
                    const prefix = `/${bucketName}/`;
                    if (urlObj.pathname.startsWith(prefix)) {
                        pathKey = urlObj.pathname.replace(prefix, '');
                    } else {
                        // Strip leading slash
                        pathKey = urlObj.pathname.substring(1);
                    }
                }
                try {
                    const freshUrl = await getSignedDownloadUrl(pathKey);
                    if (freshUrl) signedUrl = freshUrl;
                } catch (signErr) {
                    console.error('Failed to dynamically sign report url:', signErr.message);
                }
            }
            return { ...report, fileUrl: signedUrl };
        }));

        sendResponse(res, 200, signedReports, 'Health reports fetched');
    } catch (error) {
        next(error);
    }
};

// DELETE /api/users/health-reports/:reportId  (Delete a health report)
const deleteHealthReport = async (req, res, next) => {
    try {
        const { reportId } = req.params;
        const report = await prisma.healthReport.findUnique({
            where: { id: reportId },
        });

        if (!report) {
            return res.status(404).json({ success: false, message: 'Report not found' });
        }

        if (req.user?.type !== 'admin' && report.userId !== req.user.id) {
            return res.status(403).json({ success: false, message: 'Unauthorized' });
        }

        await prisma.healthReport.delete({
            where: { id: reportId },
        });

        sendResponse(res, 200, null, 'Health report deleted');
    } catch (error) {
        next(error);
    }
};

// PUT /api/users/profile/device-token  (B-05: Register FCM device token)
const registerDeviceToken = async (req, res, next) => {
    try {
        const { fcmToken } = req.body;
        if (!fcmToken) return res.status(400).json({ success: false, message: 'fcmToken is required' });

        await prisma.user.update({
            where: { id: req.user.id },
            data: { fcmDeviceToken: fcmToken },
        });

        sendResponse(res, 200, null, 'Device token registered');
    } catch (error) {
        next(error);
    }
};

// PUT /api/users/profile/avatar  (App user — upload profile image)
const uploadProfileAvatar = async (req, res, next) => {
    try {
        if (!req.file) return res.status(400).json({ success: false, message: 'Image file required' });

        const { url } = await uploadFile(req.file.buffer, 'profile-avatars', req.file.originalname, null, req.user.id);

        // Add cache-busting timestamp so new uploads appear instantly
        // This creates a unique URL each upload: avatar.jpg?v=1715698600
        // CDN treats this as new content, bypasses cache
        const versionedUrl = `${url}?v=${Date.now()}`;
        logger.info(`Avatar versioned URL: ${versionedUrl}`);

        const user = await prisma.user.update({
            where: { id: req.user.id },
            data: { profileImageUrl: versionedUrl },
            include: {
                city: { select: { name: true, code: true } },
                addresses: true,
                emergencyContacts: true,
                medicalCards: true,
                subscriptions: {
                    where: { status: 'ACTIVE' },
                    include: { plan: true },
                },
            },
        });

        const { otpCode, otpExpiresAt, refreshToken: rt, ...safeUser } = user;

        // Transform profile image URL from GCS to CDN in response
        if (safeUser.profileImageUrl) {
            safeUser.profileImageUrl = transformProfileImageToCDN(safeUser.profileImageUrl);
        }

        sendResponse(res, 200, safeUser, 'Profile image updated');
    } catch (error) {
        next(error);
    }
};

// DELETE /api/users/profile  (App user — soft delete account and anonymize data)
const deleteProfile = async (req, res, next) => {
    const userId = req.user.id;
    try {
        logger.info(`[DELETE_ACCOUNT] Soft-deleting user ${userId} and redacting PII`);

        const user = await prisma.user.findUnique({ where: { id: userId } });
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        if (user.status === 'DELETED') {
            return res.status(400).json({ success: false, message: 'Account is already deleted' });
        }

        // Anonymize user details but keep records in the DB
        const redactedPhone = `deleted_${userId}_${user.phone}`;
        const redactedEmail = user.email ? `deleted_${userId}_${user.email}` : null;

        // Perform soft delete, clean up tokens, and set status to DELETED
        await prisma.user.update({
            where: { id: userId },
            data: {
                name: 'Deleted User',
                phone: redactedPhone,
                email: redactedEmail,
                profileImageUrl: null,
                fcmDeviceToken: null,
                refreshToken: null,
                otpCode: null,
                otpExpiresAt: null,
                status: 'DELETED',
                deletedAt: new Date()
            }
        });

        // Delete saved cards (security requirement)
        await prisma.savedCard.deleteMany({ where: { userId } });

        logger.info(`[DELETE_ACCOUNT] User ${userId} soft-deleted successfully`);
        sendResponse(res, 200, null, 'Account deleted successfully');
    } catch (error) {
        logger.error(`[DELETE_ACCOUNT] Error soft-deleting user ${userId}:`, error.message);
        next(error);
    }
};

// DELETE /api/users/:id (Admin — soft delete account and anonymize data)
const deleteProfileByAdmin = async (req, res, next) => {
    const userId = req.params.id;
    try {
        logger.info(`[ADMIN_DELETE_ACCOUNT] Soft-deleting user ${userId} and redacting PII`);

        const user = await prisma.user.findUnique({ where: { id: userId } });
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        if (user.status === 'DELETED') {
            return res.status(400).json({ success: false, message: 'Account is already deleted' });
        }

        // Anonymize user details but keep records in the DB
        const redactedPhone = `deleted_${userId}_${user.phone}`;
        const redactedEmail = user.email ? `deleted_${userId}_${user.email}` : null;

        // Perform soft delete, clean up tokens, and set status to DELETED
        await prisma.user.update({
            where: { id: userId },
            data: {
                name: 'Deleted User',
                phone: redactedPhone,
                email: redactedEmail,
                profileImageUrl: null,
                fcmDeviceToken: null,
                refreshToken: null,
                otpCode: null,
                otpExpiresAt: null,
                status: 'DELETED',
                deletedAt: new Date()
            }
        });

        // Delete saved cards (security requirement)
        await prisma.savedCard.deleteMany({ where: { userId } });

        logger.info(`[ADMIN_DELETE_ACCOUNT] User ${userId} soft-deleted successfully`);
        sendResponse(res, 200, null, 'Account deleted successfully');
    } catch (error) {
        logger.error(`[ADMIN_DELETE_ACCOUNT] Error soft-deleting user ${userId}:`, error.message);
        next(error);
    }
};

const getAllHealthReports = async (req, res, next) => {
    try {
        const { search, category } = req.query;
        const where = {};
        if (category) {
            where.category = category;
        }
        if (search) {
            where.user = {
                OR: [
                    { name: { contains: search, mode: 'insensitive' } },
                    { uniqueUserId: { contains: search, mode: 'insensitive' } },
                    { phone: { contains: search } }
                ]
            };
        }
        const reports = await prisma.healthReport.findMany({
            where,
            include: {
                user: { select: { id: true, name: true, uniqueUserId: true, phone: true } }
            },
            orderBy: { createdAt: 'desc' }
        });
        sendResponse(res, 200, reports, 'All health reports retrieved');
    } catch (error) {
        next(error);
    }
};

module.exports = {
    getUsers, getUserById, createUser, updateUser,
    blockUser, suspendUser, activateUser,
    addEmergencyContact, removeEmergencyContact,
    addAddress, updateAddress, deleteAddress,
    upsertMedicalCard, uploadHealthReport, deleteHealthReport,
    getMyProfile, updateMyProfile, registerDeviceToken, uploadProfileAvatar, getMyHealthReports, deleteProfile, deleteProfileByAdmin,
    getAllHealthReports,
};
