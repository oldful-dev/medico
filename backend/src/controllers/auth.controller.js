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
    generateUserId,
} = require('../utils/helpers');
const { sendWhatsApp, requestOTP: requestSmsOTP, verifyOTP: verifySmsOTP } = require('../utils/notifications');
const { auth: firebaseAuth } = require('../config/firebase');
const sessionService = require('../services/session.service');

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

        // Record active session for multi-device tracking
        await sessionService.recordAdminSession({
            adminId: admin.id,
            ipAddress: req.ip,
            userAgent: req.get('user-agent'),
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

        // Primary: SMS OTP
        const response = await requestSmsOTP(phoneNumber);

        if (!response.success) {
            // Fallback: WhatsApp OTP only if SMS failed
            try {
                const otpLog = await prisma.otpLog.findFirst({
                    where: { phoneNumber },
                    orderBy: { createdAt: 'desc' },
                    select: { code: true },
                });
                if (otpLog?.code) {
                    const { sendOTP } = require('../services/whatsapp');
                    await sendOTP({
                        phone: phoneNumber,
                        code: otpLog.code,
                        supportContact: process.env.SUPPORT_PHONE || '+91 94801 98108',
                    });
                    logger.info(`[OTP] SMS failed → WhatsApp fallback sent to ${phoneNumber}`);
                }
            } catch (waErr) {
                logger.warn(`[OTP] WhatsApp fallback failed: ${waErr.message}`);
            }
        }

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

        // Verify OTP via notification service
        const verification = await verifySmsOTP(phoneNumber, otp);

        if (!verification.success) {
            return res.status(400).json({ success: false, message: 'Invalid or expired OTP' });
        }

        let user = await prisma.user.findUnique({ where: { phone: phoneNumber } });
        let isNewUser = !user;

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

        // Generate Firebase custom token for client-side Firebase Auth
        let firebaseToken = null;
        try {
            firebaseToken = await firebaseAuth.createCustomToken(user.id, {
                phone: user.phone,
                role: 'user',
            });
        } catch (err) {
            logger.warn('Firebase custom token generation failed:', err.message);
        }

        await prisma.user.update({
            where: { id: user.id },
            data: { refreshToken },
        });

        // Record active session for multi-device tracking
        await sessionService.recordUserSession({
            userId: user.id,
            ipAddress: req.ip,
            userAgent: req.get('user-agent'),
        });

        // Set secure httpOnly cookies for web persistence
        res.cookie('auth-token', accessToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            signed: true,
            sameSite: 'lax',
            maxAge: 3600000, // 1 hour
        });

        res.cookie('refresh-token', refreshToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            signed: true,
            sameSite: 'lax',
            maxAge: 30 * 24 * 3600000, // 30 days
        });

        res.json({
            success: true,
            data: {
                isNewUser: false,
                accessToken,
                refreshToken,
                firebaseToken,
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
        let { refreshToken } = req.body;
        
        // Fallback to cookie
        if (!refreshToken && req.signedCookies) {
            refreshToken = req.signedCookies['refresh-token'];
        }

        if (!refreshToken) {
            return res.status(400).json({ success: false, message: 'Refresh token required' });
        }

        const jwt = require('jsonwebtoken');
        const decoded = jwt.verify(refreshToken, process.env.JWT_SECRET);

        const user = await prisma.user.findUnique({ where: { id: decoded.id } });
        if (!user || user.refreshToken !== refreshToken) {
            return res.status(401).json({ success: false, message: 'Invalid session' });
        }

        const payload = { id: user.id, type: 'user' };
        const newAccessToken = generateAccessToken(payload);

        // Update cookie
        res.cookie('auth-token', newAccessToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            signed: true,
            sameSite: 'lax',
            maxAge: 3600000, 
        });

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

        res.clearCookie('auth-token');
        res.clearCookie('refresh-token');

        res.json({ success: true, message: 'Logged out successfully' });
    } catch (error) {
        next(error);
    }
};

/**
 * POST /api/auth/google
 * Google Sign-In: verify Google ID token, find or create user
 */
const googleSignIn = async (req, res, next) => {
    try {
        const { idToken, accessToken, email, name, photoUrl } = req.body;

        if (!email) {
            return res.status(400).json({ success: false, message: 'Email is required' });
        }
        if (!idToken && !accessToken) {
            return res.status(400).json({ success: false, message: 'Google token is required' });
        }

        let googleEmail = email;
        let googleName = name || '';
        let googlePhoto = photoUrl || '';
        let verified = false;

        // 1. Try Firebase ID token verification (works when idToken is a Firebase token)
        if (idToken && !verified) {
            try {
                const decodedToken = await firebaseAuth.verifyIdToken(idToken);
                googleEmail = decodedToken.email || email;
                googleName = decodedToken.name || name || '';
                googlePhoto = decodedToken.picture || photoUrl || '';
                verified = true;
            } catch (firebaseErr) {
                logger.debug('Firebase verifyIdToken failed:', firebaseErr.message);
            }
        }

        // 2. Try Google tokeninfo endpoint with idToken (verifies Google-issued JWT)
        if (idToken && !verified) {
            try {
                const tokenInfoRes = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${idToken}`);
                if (tokenInfoRes.ok) {
                    const tokenInfo = await tokenInfoRes.json();
                    if (tokenInfo.email && tokenInfo.email.toLowerCase() === email.toLowerCase()) {
                        googleEmail = tokenInfo.email;
                        googleName = tokenInfo.name || name || '';
                        googlePhoto = tokenInfo.picture || photoUrl || '';
                        verified = true;
                    }
                }
            } catch (tokenInfoErr) {
                logger.debug('Google tokeninfo failed:', tokenInfoErr.message);
            }
        }

        // 3. Fall back to userinfo API with accessToken
        if (accessToken && !verified) {
            try {
                const userInfoRes = await fetch('https://www.googleapis.com/userinfo/v2/me', {
                    headers: { Authorization: `Bearer ${accessToken}` },
                });
                if (userInfoRes.ok) {
                    const userInfo = await userInfoRes.json();
                    if (userInfo.email && userInfo.email.toLowerCase() === email.toLowerCase()) {
                        googleEmail = userInfo.email;
                        googleName = userInfo.name || name || '';
                        googlePhoto = userInfo.picture || photoUrl || '';
                        verified = true;
                    }
                }
            } catch (fetchErr) {
                logger.debug('Google userinfo failed:', fetchErr.message);
            }
        }

        if (!verified) {
            return res.status(401).json({ success: false, message: 'Invalid Google token' });
        }

        // Look up user by email
        let user = await prisma.user.findFirst({ where: { email: googleEmail } });
        let isNewUser = !user;

        if (isNewUser) {
            // Return that it's a new user — frontend will collect phone + profile
            return res.json({
                success: true,
                data: {
                    isNewUser: true,
                    email: googleEmail,
                    name: googleName,
                    photoUrl: googlePhoto,
                },
            });
        }

        // Existing user — issue tokens
        const payload = { id: user.id, type: 'user' };
        const jwtAccessToken = generateAccessToken(payload);
        const jwtRefreshToken = generateRefreshToken(payload);

        let firebaseToken = null;
        try {
            firebaseToken = await firebaseAuth.createCustomToken(user.id, {
                phone: user.phone,
                role: 'user',
            });
        } catch (err) {
            logger.warn('Firebase custom token generation failed:', err.message);
        }

        await prisma.user.update({
            where: { id: user.id },
            data: { refreshToken: jwtRefreshToken },
        });

        // Record active session for multi-device tracking
        await sessionService.recordUserSession({
            userId: user.id,
            ipAddress: req.ip,
            userAgent: req.get('user-agent'),
        });

        res.json({
            success: true,
            data: {
                isNewUser: false,
                accessToken: jwtAccessToken,
                refreshToken: jwtRefreshToken,
                firebaseToken,
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

module.exports = {
    adminLogin,
    adminRegister,
    adminRefreshToken,
    requestOTP,
    verifyOTP,
    userRefreshToken,
    logout,
    googleSignIn,
};
