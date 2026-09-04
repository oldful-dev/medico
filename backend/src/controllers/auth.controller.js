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

// ─── Admin auth cookies (HttpOnly) ───────────────────────
// admin.ayuxacare.com is a fully static export (no server), so it can't
// read/set HttpOnly cookies itself — the backend sets them here, scoped to
// the shared parent domain so both admin.ayuxacare.com and
// api.ayuxacare.com receive them. Tokens are ALSO still returned in the
// JSON body during rollout (see admin/src/lib/api.js) as a fallback for an
// admin still on a cached old frontend build that expects a body token —
// remove that once the new cookie-based flow is confirmed stable.
const ADMIN_COOKIE_DOMAIN = process.env.ADMIN_COOKIE_DOMAIN || '.ayuxacare.com';
const isProd = process.env.NODE_ENV === 'production';

// SameSite=None is REQUIRED to be paired with Secure (browsers silently
// drop the cookie otherwise) — so this can only be "none"+secure together
// in production (real HTTPS + cross-subdomain), or "lax"+not-secure for
// local HTTP dev (admin/api both effectively localhost, no cross-site need).
const cookieBaseOptions = () => isProd
    ? { httpOnly: true, secure: true, sameSite: 'none', domain: ADMIN_COOKIE_DOMAIN, path: '/' }
    : { httpOnly: true, secure: false, sameSite: 'lax', path: '/' };

const setAdminAuthCookies = (res, accessToken, refreshToken) => {
    const base = cookieBaseOptions();
    res.cookie('adminToken', accessToken, { ...base, maxAge: 15 * 60 * 1000 }); // 15m, matches JWT_ACCESS_EXPIRY
    res.cookie('adminRefreshToken', refreshToken, { ...base, maxAge: 7 * 24 * 60 * 60 * 1000 }); // 7d, matches JWT_REFRESH_EXPIRY
};

const clearAdminAuthCookies = (res) => {
    const base = cookieBaseOptions();
    res.clearCookie('adminToken', base);
    res.clearCookie('adminRefreshToken', base);
};

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
            logger.warn('Admin login failed — unknown email', { email, ip: req.ip });
            return res.status(401).json({ success: false, message: 'Invalid credentials' });
        }

        if (!admin.isActive) {
            logger.warn('Admin login blocked — deactivated account', { adminId: admin.id, ip: req.ip });
            return res.status(403).json({ success: false, message: 'Account deactivated' });
        }

        const isValid = await comparePassword(password, admin.passwordHash);
        if (!isValid) {
            logger.warn('Admin login failed — wrong password', { adminId: admin.id, ip: req.ip });
            return res.status(401).json({ success: false, message: 'Invalid credentials' });
        }

        // Record active session for multi-device tracking
        const session = await sessionService.recordAdminSession({
            adminId: admin.id,
            req,
        });

        const payload = { id: admin.id, role: admin.role, type: 'admin', cityId: admin.cityId, sessionId: session?.id };
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

        setAdminAuthCookies(res, accessToken, refreshToken);

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
 * GET /api/auth/admin/me
 * Restores admin session state on page load. Needed because the admin
 * token is now an HttpOnly cookie — the frontend can no longer decode it
 * itself (see admin/src/store/useAuthStore.js checkAuth), so it asks the
 * backend instead. Returns fresh DB data rather than echoing the JWT
 * payload, in case the admin's role/name/city changed since the token
 * was issued.
 */
const getAdminMe = async (req, res, next) => {
    try {
        const admin = await prisma.admin.findUnique({
            where: { id: req.user.id },
            select: { id: true, name: true, email: true, role: true, cityId: true, isActive: true },
        });
        if (!admin || !admin.isActive) {
            return res.status(401).json({ success: false, message: 'Account not found or deactivated' });
        }
        // sessionId comes from the JWT (req.user), not the DB — used by the
        // admin frontend's Active Sessions page to highlight "this device"
        // now that it can no longer decode the HttpOnly cookie itself.
        res.json({ success: true, data: { ...admin, sessionId: req.user.sessionId || null } });
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
        // Prefer the HttpOnly cookie; fall back to the body for an admin
        // still on a cached old frontend build (see setAdminAuthCookies).
        const refreshToken = req.cookies?.adminRefreshToken || req.body?.refreshToken;
        if (!refreshToken) {
            return res.status(400).json({ success: false, message: 'Refresh token required' });
        }

        const jwt = require('jsonwebtoken');
        const decoded = jwt.verify(refreshToken, process.env.JWT_SECRET);

        const admin = await prisma.admin.findUnique({ where: { id: decoded.id } });
        if (!admin || admin.refreshToken !== refreshToken) {
            return res.status(401).json({ success: false, message: 'Invalid refresh token' });
        }

        const payload = { id: admin.id, role: admin.role, type: 'admin', cityId: admin.cityId, sessionId: decoded.sessionId };
        const newAccessToken = generateAccessToken(payload);

        const base = cookieBaseOptions();
        res.cookie('adminToken', newAccessToken, { ...base, maxAge: 15 * 60 * 1000 });

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
            logger.warn('OTP verification failed', { phoneNumber, ip: req.ip });
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

        // Record active session for multi-device tracking
        const session = await sessionService.recordUserSession({
            userId: user.id,
            req,
        });

        const payload = { id: user.id, type: 'user', sessionId: session?.id };
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

        const payload = { id: user.id, type: 'user', sessionId: decoded.sessionId };
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
            if (req.user.sessionId) {
                await prisma.adminSession.updateMany({
                    where: { id: req.user.sessionId },
                    data: { isActive: false },
                });
            }
            // Mobile app users authenticate via bearer token only (no
            // cookies); only admins have HttpOnly auth cookies to clear.
            clearAdminAuthCookies(res);
        } else {
            await prisma.user.update({
                where: { id: req.user.id },
                data: { refreshToken: null },
            });
            if (req.user.sessionId) {
                await prisma.userSession.updateMany({
                    where: { id: req.user.sessionId },
                    data: { isActive: false },
                });
            }
        }

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
            logger.warn('Google login failed — token/email mismatch', { email, ip: req.ip });
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

        // Record active session for multi-device tracking
        const session = await sessionService.recordUserSession({
            userId: user.id,
            req,
        });

        // Existing user — issue tokens
        const payload = { id: user.id, type: 'user', sessionId: session?.id };
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
    getAdminMe,
    requestOTP,
    verifyOTP,
    userRefreshToken,
    logout,
    googleSignIn,
};
