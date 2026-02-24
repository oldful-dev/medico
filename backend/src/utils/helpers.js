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

    // Increment the city sequence atomically
    const updated = await prisma.city.update({
        where: { id: cityId },
        data: { sequence: { increment: 1 } },
    });

    const paddedSeq = String(updated.sequence).padStart(5, '0');
    return `MED-${city.code}-${paddedSeq}`;
};

// ─── Booking Code Generation ───────────────

const generateBookingCode = async () => {
    const count = await prisma.booking.count();
    return `BK-${String(count + 1).padStart(4, '0')}`;
};

// ─── Invoice Number Generation ─────────────

const generateInvoiceNumber = async () => {
    const year = new Date().getFullYear();
    const count = await prisma.invoice.count({
        where: {
            createdAt: {
                gte: new Date(`${year}-01-01`),
            },
        },
    });
    return `INV-${year}-${String(count + 1).padStart(4, '0')}`;
};

// ─── Ticket Code Generation ───────────────

const generateTicketCode = async () => {
    const count = await prisma.supportTicket.count();
    return `TKT-${String(count + 1).padStart(4, '0')}`;
};

// ─── OTP Generation ───────────────────────

const generateOTP = () => {
    return String(Math.floor(100000 + Math.random() * 900000)); // 6-digit
};

// ─── Subscription Expiry Calculator ───────

const calculateExpiryDate = (startDate, billingCycle) => {
    const date = new Date(startDate);
    switch (billingCycle) {
        case 'QUARTERLY':
            date.setMonth(date.getMonth() + 3);
            break;
        case 'BIANNUAL':
            date.setMonth(date.getMonth() + 6);
            break;
        case 'YEARLY':
            date.setFullYear(date.getFullYear() + 1);
            break;
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
