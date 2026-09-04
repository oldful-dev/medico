// ──────────────────────────────────────────────
//  Global Error Handler Middleware
// ──────────────────────────────────────────────

const { logger } = require('../config/logger');

class AppError extends Error {
    constructor(message, statusCode = 500) {
        super(message);
        this.statusCode = statusCode;
        this.isOperational = true;
        Error.captureStackTrace(this, this.constructor);
    }
}

const errorHandler = (err, req, res, next) => {
    let statusCode = err.statusCode || 500;
    let message = err.message || 'Internal Server Error';

    // Prisma known errors
    if (err.code === 'P2002') {
        statusCode = 409;
        message = `Duplicate value for field: ${err.meta?.target?.join(', ')}`;
    }
    if (err.code === 'P2025') {
        statusCode = 404;
        message = 'Record not found';
    }
    if (err.code === 'P2003') {
        statusCode = 409;
        message = `Related record not found for field: ${err.meta?.field_name || 'unknown'}`;
    }
    if (typeof err.code === 'string' && err.code.startsWith('P1')) {
        statusCode = 503;
        message = 'Database connection error';
    }

    // JWT errors
    if (err.name === 'JsonWebTokenError') {
        statusCode = 401;
        message = 'Invalid token';
    }

    // Axios partner API errors
    if (err.isAxiosError && err.response) {
        statusCode = err.response.status;
        message = err.response.data?.message || err.message;
    }

    // Validation errors (express-validator)
    if (err.array && typeof err.array === 'function') {
        statusCode = 422;
        message = 'Validation failed';
    }

    logger.error(`[${statusCode}] ${message}`, {
        path: req.path,
        method: req.method,
        requestId: req.id,
        userId: req.user?.id || req.admin?.id,
        prismaCode: err.code,
        stack: err.stack,
    });

    res.status(statusCode).json({
        success: false,
        message,
        ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
    });
};

const notFoundHandler = (req, res) => {
    res.status(404).json({
        success: false,
        message: `Route ${req.method} ${req.originalUrl} not found`,
    });
};

module.exports = { AppError, errorHandler, notFoundHandler };
