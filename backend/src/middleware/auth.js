// ──────────────────────────────────────────────
//  JWT Authentication Middleware
//  Supports both Admin and User tokens
// ──────────────────────────────────────────────

const jwt = require('jsonwebtoken');
const prisma = require('../config/database');
const { logger } = require('../config/logger');

/**
 * Verify JWT token and attach decoded payload to req.user
 */
const authenticate = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ success: false, message: 'Access token required' });
        }

        const token = authHeader.split(' ')[1];
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        req.user = decoded; // { id, role, type: 'admin' | 'user' }
        next();
    } catch (error) {
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({ success: false, message: 'Token expired' });
        }
        logger.error('Auth middleware error:', error);
        return res.status(401).json({ success: false, message: 'Invalid token' });
    }
};

/**
 * Verify the request is from an authenticated Admin
 */
const authenticateAdmin = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ success: false, message: 'Access token required' });
        }

        const token = authHeader.split(' ')[1];
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        if (decoded.type !== 'admin') {
            return res.status(403).json({ success: false, message: 'Admin access required' });
        }

        // Verify admin still exists and is active
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
        logger.error('Admin auth error:', error);
        return res.status(401).json({ success: false, message: 'Invalid token' });
    }
};

/**
 * Verify the request is from an authenticated App User
 */
const authenticateUser = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ success: false, message: 'Access token required' });
        }

        const token = authHeader.split(' ')[1];
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        if (decoded.type !== 'user') {
            return res.status(403).json({ success: false, message: 'User access required' });
        }

        const user = await prisma.user.findUnique({ where: { id: decoded.id } });
        if (!user || user.status === 'BLOCKED') {
            return res.status(403).json({ success: false, message: 'Account is blocked' });
        }

        req.appUser = user;
        req.user = decoded;
        next();
    } catch (error) {
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({ success: false, message: 'Token expired' });
        }
        logger.error('User auth error:', error);
        return res.status(401).json({ success: false, message: 'Invalid token' });
    }
};

module.exports = { authenticate, authenticateAdmin, authenticateUser };
