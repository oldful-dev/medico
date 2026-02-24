// ──────────────────────────────────────────────
//  Auth Controller
//  Admin login/register + App user OTP flow
// ──────────────────────────────────────────────

const prisma = require('../config/database');
const { logger } = require('../config/logger');
const { createAuditLog } = require('../middleware/audit');
const {
    generateAccessToken, generateRefreshToken,
    hashPassword, comparePassword,
    generateOTP, generateUserId,
} = require('../utils/helpers');
const { sendWhatsApp } = require('../utils/notifications');

// ═══════════════════════════════════════════
//  ADMIN AUTH
// ═══════════════════════════════════════════

/**
 * POST /api/auth/admin/login
 */
const adminLogin = async (req, res, next) => {
    try {
        const { email, password } = req.body;

        const admin = await prisma.admin.findUnique({ where: { email } });
        if (!admin) {
            return res.status(401).json({ success: false, message: 'Invalid credentials' });
        }

        if (!admin.isActive) {
            return res.status(403).json({ success: false, message: 'Account deactivated' });
        }

        const isValid = await comparePassword(password, admin.passwordHash);
        if (!isValid) {
            return res.status(401).json({ success: false, message: 'Invalid credentials' });
        }

        const payload = { id: admin.id, role: admin.role, type: 'admin', cityId: admin.cityId };
        const accessToken = generateAccessToken(payload);
        const refreshToken = generateRefreshToken(payload);

        // Store refresh token
        await prisma.admin.update({
            where: { id: admin.id },
            data: { refreshToken, lastLoginAt: new Date() },
        });

        // Audit log
        await createAuditLog({
            adminId: admin.id,
            action: 'ADMIN_LOGIN',
            entity: 'Admin',
            entityId: admin.id,
            ipAddress: req.ip,
            userAgent: req.get('user-agent'),
        });

        res.json({
            success: true,
            data: {
                accessToken,
                refreshToken,
                admin: {
                    id: admin.id,
                    name: admin.name,
                    email: admin.email,
                    role: admin.role,
                    cityId: admin.cityId,
                },
            },
        });
    } catch (error) {
        next(error);
    }
};

/**
 * POST /api/auth/admin/register  (SUPER_ADMIN only)
 */
const adminRegister = async (req, res, next) => {
    try {
        const { name, email, password, role, phone, cityId } = req.body;

        const passwordHash = await hashPassword(password);

        const admin = await prisma.admin.create({
            data: { name, email, passwordHash, role, phone, cityId },
        });

        await createAuditLog({
            adminId: req.user.id,
            action: 'ADMIN_REGISTER',
            entity: 'Admin',
            entityId: admin.id,
            newValue: { name, email, role },
            ipAddress: req.ip,
        });

        res.status(201).json({
            success: true,
            message: 'Admin created successfully',
            data: { id: admin.id, name: admin.name, email: admin.email, role: admin.role },
        });
    } catch (error) {
        next(error);
    }
};

/**
 * POST /api/auth/admin/refresh
 */
const adminRefreshToken = async (req, res, next) => {
    try {
        const { refreshToken } = req.body;
        if (!refreshToken) {
            return res.status(400).json({ success: false, message: 'Refresh token required' });
        }

        const jwt = require('jsonwebtoken');
        const decoded = jwt.verify(refreshToken, process.env.JWT_SECRET);

        const admin = await prisma.admin.findUnique({ where: { id: decoded.id } });
        if (!admin || admin.refreshToken !== refreshToken) {
            return res.status(401).json({ success: false, message: 'Invalid refresh token' });
        }

        const payload = { id: admin.id, role: admin.role, type: 'admin', cityId: admin.cityId };
        const newAccessToken = generateAccessToken(payload);

        res.json({ success: true, data: { accessToken: newAccessToken } });
    } catch (error) {
        next(error);
    }
};

// ═══════════════════════════════════════════
//  APP USER AUTH (OTP-based)
// ═══════════════════════════════════════════

/**
 * POST /api/auth/request-otp
 */
const requestOTP = async (req, res, next) => {
    try {
        const { phoneNumber } = req.body;

        const otp = generateOTP();
        const otpExpiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

        // Upsert user with OTP
        let user = await prisma.user.findUnique({ where: { phone: phoneNumber } });

        if (user) {
            await prisma.user.update({
                where: { id: user.id },
                data: { otpCode: otp, otpExpiresAt },
            });
        } else {
            // Store OTP temporarily — user will be created on verify if new
            // For now, create a minimal placeholder
            // The actual profile will be completed in a later step
        }

        // Send OTP via WhatsApp
        await sendWhatsApp({
            phoneNumber,
            templateName: 'otp_verification',
            parameters: [otp],
        });

        logger.info(`OTP sent to ${phoneNumber}: ${otp}`); // Remove in production

        res.json({ success: true, message: 'OTP sent successfully' });
    } catch (error) {
        next(error);
    }
};

/**
 * POST /api/auth/verify-otp
 */
const verifyOTP = async (req, res, next) => {
    try {
        const { phoneNumber, otp } = req.body;

        let user = await prisma.user.findUnique({ where: { phone: phoneNumber } });
        let isNewUser = false;

        if (!user) {
            // New user — create and verify
            // For OTP, in dev mode accept '123456'
            if (process.env.NODE_ENV === 'development' && otp === '123456') {
                // Create will happen after OTP verify — we need a city
                isNewUser = true;
            } else {
                return res.status(400).json({ success: false, message: 'Invalid OTP' });
            }
        } else {
            // Verify OTP
            if (user.otpCode !== otp || new Date() > new Date(user.otpExpiresAt)) {
                // Dev bypass
                if (!(process.env.NODE_ENV === 'development' && otp === '123456')) {
                    return res.status(400).json({ success: false, message: 'Invalid or expired OTP' });
                }
            }

            // Clear OTP
            await prisma.user.update({
                where: { id: user.id },
                data: { otpCode: null, otpExpiresAt: null },
            });
        }

        if (isNewUser) {
            // Just return that it's a new user — frontend will collect profile data
            return res.json({
                success: true,
                data: { isNewUser: true, phoneNumber },
            });
        }

        const payload = { id: user.id, type: 'user' };
        const accessToken = generateAccessToken(payload);
        const refreshToken = generateRefreshToken(payload);

        await prisma.user.update({
            where: { id: user.id },
            data: { refreshToken },
        });

        res.json({
            success: true,
            data: {
                isNewUser: false,
                accessToken,
                refreshToken,
                user: {
                    id: user.id,
                    uniqueUserId: user.uniqueUserId,
                    name: user.name,
                    phone: user.phone,
                },
            },
        });
    } catch (error) {
        next(error);
    }
};

/**
 * POST /api/auth/user/refresh
 */
const userRefreshToken = async (req, res, next) => {
    try {
        const { refreshToken } = req.body;
        const jwt = require('jsonwebtoken');
        const decoded = jwt.verify(refreshToken, process.env.JWT_SECRET);

        const user = await prisma.user.findUnique({ where: { id: decoded.id } });
        if (!user || user.refreshToken !== refreshToken) {
            return res.status(401).json({ success: false, message: 'Invalid refresh token' });
        }

        const payload = { id: user.id, type: 'user' };
        const newAccessToken = generateAccessToken(payload);

        res.json({ success: true, data: { accessToken: newAccessToken } });
    } catch (error) {
        next(error);
    }
};

/**
 * POST /api/auth/logout
 */
const logout = async (req, res, next) => {
    try {
        if (req.user.type === 'admin') {
            await prisma.admin.update({
                where: { id: req.user.id },
                data: { refreshToken: null },
            });
        } else {
            await prisma.user.update({
                where: { id: req.user.id },
                data: { refreshToken: null },
            });
        }
        res.json({ success: true, message: 'Logged out successfully' });
    } catch (error) {
        next(error);
    }
};

module.exports = {
    adminLogin,
    adminRegister,
    adminRefreshToken,
    requestOTP,
    verifyOTP,
    userRefreshToken,
    logout,
};
