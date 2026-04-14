// Admin Management Routes
const router = require('express').Router();
const { authenticateAdmin } = require('../middleware/auth');
const { authorize } = require('../middleware/rbac');
const { auditMiddleware } = require('../middleware/audit');
const ctrl = require('../controllers/admin.controller');

router.use(authenticateAdmin);
router.use(authorize('SUPER_ADMIN'));
router.use(auditMiddleware('Admin'));

router.get('/', ctrl.getAdmins);
router.get('/profiles', ctrl.getProfiles);
router.get('/profiles/metadata', ctrl.getMetadata);
router.put('/profiles/metadata', ctrl.updateMetadata);
router.post('/profiles/upload-url', ctrl.requestUploadUrl);
router.post('/profiles', ctrl.createProfile);
router.post('/profiles/bulk-status', ctrl.bulkUpdateStatus);
router.post('/profiles/bulk-delete', ctrl.bulkDelete);
router.delete('/profiles/:id', ctrl.deleteProfile);
router.put('/profiles/:id', ctrl.updateProfile);
router.get('/:id', ctrl.getAdminById);
router.put('/:id', ctrl.updateAdmin);
router.put('/:id/password', ctrl.updateAdminPassword);
router.delete('/:id', ctrl.deleteAdmin);

module.exports = router;
