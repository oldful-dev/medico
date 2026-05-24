// Auth Routes
const router = require('express').Router();
const { body } = require('express-validator');
const rateLimit = require('express-rate-limit');
const { validate } = require('../middleware/validate');
const { authenticate, authenticateAdmin } = require('../middleware/auth');
const { authorize } = require('../middleware/rbac');
const ctrl = require('../controllers/auth.controller');

// ─── OTP Rate Limiter (SEC-01) ──────────────────
// 3 requests per 10 minutes, keyed by phone number (fallback to IP)
const otpLimiter = rateLimit({
    windowMs: 10 * 60 * 1000, // 10 minutes
    max: 10, // Increased from 3 to 10
    keyGenerator: (req) => req.body.phoneNumber || req.ip,
    message: { success: false, message: 'Too many OTP requests. Try again in 10 minutes.' },
    standardHeaders: true,
    legacyHeaders: false,
});

// Admin Auth
router.post('/admin/login', [
    body('email').isEmail().withMessage('Valid email required'),
    body('password').notEmpty().withMessage('Password required'),
], validate, ctrl.adminLogin);

router.post('/admin/register',
    authenticateAdmin,
    authorize('SUPER_ADMIN'),
    [
        body('name').notEmpty(),
        body('email').isEmail(),
        body('password').isLength({ min: 8 }),
        body('role').isIn(['SUPER_ADMIN', 'CITY_ADMIN', 'CARE_MANAGER', 'SUPPORT_AGENT', 'BILLING_EXECUTIVE']),
    ],
    validate,
    ctrl.adminRegister
);

router.post('/admin/refresh', ctrl.adminRefreshToken);

// App User Auth
router.post('/request-otp', otpLimiter, [
    body('phoneNumber').notEmpty().withMessage('Phone number required'),
], validate, ctrl.requestOTP);

router.post('/verify-otp', [
    body('phoneNumber').notEmpty(),
    body('otp').isLength({ min: 4, max: 4 }),
], validate, ctrl.verifyOTP);

router.post('/google', [
    body('idToken').notEmpty().withMessage('Google ID token required'),
    body('email').isEmail().withMessage('Valid email required'),
], validate, ctrl.googleSignIn);

router.post('/user/refresh', ctrl.userRefreshToken);

// Logout (both admin and user)
router.post('/logout', authenticate, ctrl.logout);

module.exports = router;
