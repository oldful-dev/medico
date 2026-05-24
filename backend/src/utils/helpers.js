// ──────────────────────────────────────────────
//  Utility Helpers
// ──────────────────────────────────────────────

const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const prisma = require('../config/database');

// ─── JWT Token Generation ───────────────────

const generateAccessToken = (payload) => {
    return jwt.sign(payload, process.env.JWT_SECRET, {
        expiresIn: process.env.JWT_ACCESS_EXPIRY || '15m',
    });
};

const generateRefreshToken = (payload) => {
    return jwt.sign(payload, process.env.JWT_SECRET, {
        expiresIn: process.env.JWT_REFRESH_EXPIRY || '7d',
    });
};

// ─── Password Hashing ──────────────────────

const hashPassword = async (password) => {
    return bcrypt.hash(password, 12);
};

const comparePassword = async (password, hash) => {
    return bcrypt.compare(password, hash);
};

// ─── User ID Generation ────────────────────
// Format: MED-{CITY_CODE}-{SEQUENCE_PADDED}
// e.g. MED-BLR-00001

const generateUserId = async (cityId) => {
    const city = await prisma.city.findUnique({ where: { id: cityId } });
    if (!city) throw new Error('City not found');

    const updated = await prisma.city.update({
        where: { id: cityId },
        data: { sequence: { increment: 1 } },
    });

    const paddedSeq = String(updated.sequence).padStart(5, '0');
    return `MED-${city.code.toUpperCase()}-${paddedSeq}`;
};

// ─── Booking Code Generation ───────────────
// Uses timestamp + random suffix to avoid race-condition collisions.
// Format: BK-YYMMDD-XXXX (e.g. BK-260401-A3F7)

const generateBookingCode = async () => {
    const now = new Date();
    const yy = String(now.getFullYear()).slice(2);
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const dd = String(now.getDate()).padStart(2, '0');
    const rand = Math.random().toString(36).substring(2, 6).toUpperCase();
    return `BK-${yy}${mm}${dd}-${rand}`;
};

// ─── Invoice Number Generation ─────────────
// Format: INV-YYYY-MMDD-XXXX

const generateInvoiceNumber = async () => {
    const now = new Date();
    const year = now.getFullYear();
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const dd = String(now.getDate()).padStart(2, '0');
    const rand = Math.random().toString(36).substring(2, 6).toUpperCase();
    return `INV-${year}-${mm}${dd}-${rand}`;
};

// ─── Ticket Code Generation ───────────────
// Format: TKT-YYMMDD-XXXX

const generateTicketCode = async () => {
    const now = new Date();
    const yy = String(now.getFullYear()).slice(2);
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const dd = String(now.getDate()).padStart(2, '0');
    const rand = Math.random().toString(36).substring(2, 6).toUpperCase();
    return `TKT-${yy}${mm}${dd}-${rand}`;
};

// ─── OTP Generation ───────────────────────

const generateOTP = () => {
    return String(Math.floor(1000 + Math.random() * 9000)); // 4-digit
};

// ─── Subscription Expiry Calculator ───────

const calculateExpiryDate = (startDate, billingCycle) => {
    const date = new Date(startDate);
    switch (billingCycle) {
        case 'MONTHLY':
            date.setMonth(date.getMonth() + 1);
            break;
        case 'QUARTERLY':
            date.setMonth(date.getMonth() + 3);
            break;
        case 'BIANNUAL':
            date.setMonth(date.getMonth() + 6);
            break;
        case 'YEARLY':
            date.setFullYear(date.getFullYear() + 1);
            break;
        default:
            date.setMonth(date.getMonth() + 1); // Fallback to 1 month
    }
    return date;
};

// ─── Pagination Helper ────────────────────

const paginate = (query) => {
    const page = Math.max(1, parseInt(query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(query.limit) || 20));
    const skip = (page - 1) * limit;
    return { page, limit, skip };
};

// ─── Standard Response Helper ─────────────

const sendResponse = (res, statusCode, data, message = 'Success') => {
    return res.status(statusCode).json({
        success: statusCode < 400,
        message,
        data,
    });
};

const sendPaginatedResponse = (res, data, total, page, limit) => {
    return res.json({
        success: true,
        data,
        pagination: {
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit),
            hasMore: page * limit < total,
        },
    });
};

module.exports = {
    generateAccessToken,
    generateRefreshToken,
    hashPassword,
    comparePassword,
    generateUserId,
    generateBookingCode,
    generateInvoiceNumber,
    generateTicketCode,
    generateOTP,
    calculateExpiryDate,
    paginate,
    sendResponse,
    sendPaginatedResponse,
};
