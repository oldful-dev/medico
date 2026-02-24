// Auth Routes
const router = require('express').Router();
const { body } = require('express-validator');
const { validate } = require('../middleware/validate');
const { authenticate, authenticateAdmin } = require('../middleware/auth');
const { authorize } = require('../middleware/rbac');
const ctrl = require('../controllers/auth.controller');

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
router.post('/request-otp', [
    body('phoneNumber').notEmpty().withMessage('Phone number required'),
], validate, ctrl.requestOTP);

router.post('/verify-otp', [
    body('phoneNumber').notEmpty(),
    body('otp').isLength({ min: 6, max: 6 }),
], validate, ctrl.verifyOTP);

router.post('/user/refresh', ctrl.userRefreshToken);

// Logout (both admin and user)
router.post('/logout', authenticate, ctrl.logout);

module.exports = router;
