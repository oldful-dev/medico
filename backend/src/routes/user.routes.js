// User Routes
const router = require('express').Router();
const { authenticate, authenticateAdmin, authenticateUser } = require('../middleware/auth');
const { authorize, cityRestriction } = require('../middleware/rbac');
const { auditMiddleware } = require('../middleware/audit');
const upload = require('../middleware/upload');
const ctrl = require('../controllers/user.controller');

// App User self-service routes
router.get('/profile', authenticateUser, ctrl.getMyProfile);
router.put('/profile', authenticateUser, ctrl.updateMyProfile);

// Admin user management
router.get('/', authenticateAdmin, cityRestriction, ctrl.getUsers);
router.get('/:id', authenticateAdmin, ctrl.getUserById);
router.post('/', ctrl.createUser);  // Can be called post-OTP or by admin
router.put('/:id', authenticateAdmin, auditMiddleware('User'), ctrl.updateUser);
router.put('/:id/block', authenticateAdmin, authorize('SUPER_ADMIN', 'CITY_ADMIN'), ctrl.blockUser);
router.put('/:id/suspend', authenticateAdmin, authorize('SUPER_ADMIN', 'CITY_ADMIN'), ctrl.suspendUser);
router.put('/:id/activate', authenticateAdmin, ctrl.activateUser);

// Emergency contacts
router.post('/:id/emergency-contacts', authenticate, ctrl.addEmergencyContact);
router.delete('/:userId/emergency-contacts/:contactId', authenticate, ctrl.removeEmergencyContact);

// Addresses
router.post('/:id/addresses', authenticate, ctrl.addAddress);
router.put('/:userId/addresses/:addressId', authenticate, ctrl.updateAddress);

// Medical Card
router.post('/:id/medical-card', authenticate, ctrl.upsertMedicalCard);

// Health Reports
router.post('/:id/health-reports', authenticate, upload.single('file'), ctrl.uploadHealthReport);

module.exports = router;
