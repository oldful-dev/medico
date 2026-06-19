// ──────────────────────────────────────────────
//  JWT Authentication Middleware
//  Supports both Admin and User tokens
// ──────────────────────────────────────────────

const jwt = require('jsonwebtoken');
const prisma = require('../config/database');
const { logger } = require('../config/logger');

/**
 * Verify JWT token and attach decoded payload to req.user
 * Supports both Authorization header and 'auth-token' cookie
 */
const authenticate = async (req, res, next) => {
    try {
        let token = null;

        // 1. Check Authorization Header
        const authHeader = req.headers.authorization;
        if (authHeader && authHeader.startsWith('Bearer ')) {
            token = authHeader.split(' ')[1];
        } 
        
        // 2. Fallback to httpOnly Cookie (for web)
        if (!token && req.signedCookies) {
            token = req.signedCookies['auth-token'];
        }

        if (!token) {
            return res.status(401).json({ success: false, message: 'Authentication required' });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded;
        next();
    } catch (error) {
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({ success: false, message: 'Token expired' });
        }
        return res.status(401).json({ success: false, message: 'Invalid session' });
    }
};

/**
 * Verify the request is from an authenticated Admin
 */
const authenticateAdmin = async (req, res, next) => {
    try {
        let token = null;

        const authHeader = req.headers.authorization;
        if (authHeader && authHeader.startsWith('Bearer ')) {
            token = authHeader.split(' ')[1];
        } 
        
        if (!token && req.signedCookies) {
            token = req.signedCookies['auth-token'];
        }

        if (!token && req.query.token) {
            token = req.query.token;
        }

        if (!token) {
            return res.status(401).json({ success: false, message: 'Admin authentication required' });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        if (decoded.type !== 'admin') {
            return res.status(403).json({ success: false, message: 'Admin access restricted' });
        }

        const admin = await prisma.admin.findUnique({ where: { id: decoded.id } });
        if (!admin || !admin.isActive) {
            return res.status(403).json({ success: false, message: 'Admin account deactivated' });
        }

        req.admin = admin;
        req.user = decoded;
        next();
    } catch (error) {
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({ success: false, message: 'Token expired' });
        }
        return res.status(401).json({ success: false, message: 'Invalid session' });
    }
};

/**
 * Verify the request is from an authenticated App User
 */
const authenticateUser = async (req, res, next) => {
    try {
        let token = null;

        const authHeader = req.headers.authorization;
        if (authHeader && authHeader.startsWith('Bearer ')) {
            token = authHeader.split(' ')[1];
        } 
        
        if (!token && req.signedCookies) {
            token = req.signedCookies['auth-token'];
        }

        if (!token) {
            return res.status(401).json({ success: false, message: 'Session required' });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        if (decoded.type !== 'user') {
            return res.status(403).json({ success: false, message: 'User access restricted' });
        }

        const user = await prisma.user.findUnique({ where: { id: decoded.id } });
        if (!user || user.status === 'BLOCKED') {
            return res.status(403).json({ success: false, message: 'Account blocked' });
        }

        req.appUser = user;
        req.user = decoded;
        next();
    } catch (error) {
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({ success: false, message: 'Token expired' });
        }
        return res.status(401).json({ success: false, message: 'Invalid session' });
    }
};

module.exports = { authenticate, authenticateAdmin, authenticateUser };
