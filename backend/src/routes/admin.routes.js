// Admin Management Routes
const router = require('express').Router();
const { authenticateAdmin } = require('../middleware/auth');
const { authorize, blockNonManagement } = require('../middleware/rbac');
const { auditMiddleware } = require('../middleware/audit');
const ctrl = require('../controllers/admin.controller');
const dumpCtrl = require('../controllers/admin-customer-dump.controller');

// All routes require admin auth
router.use(authenticateAdmin);

// ─── SUPER_ADMIN only: Admin account management ────────────────────────────────
router.get('/customer-media-dump', authorize('SUPER_ADMIN'), dumpCtrl.getCustomerMediaDump);
router.get('/',          authorize('SUPER_ADMIN'), ctrl.getAdmins);
router.get('/:id',       authorize('SUPER_ADMIN'), ctrl.getAdminById);
router.put('/:id',       authorize('SUPER_ADMIN'), auditMiddleware('Admin'), ctrl.updateAdmin);
router.put('/:id/password', authorize('SUPER_ADMIN'), auditMiddleware('Admin'), ctrl.updateAdminPassword);
router.delete('/:id',    authorize('SUPER_ADMIN'), auditMiddleware('Admin'), ctrl.deleteAdmin);

// ─── Staff Profiles: SUPER_ADMIN + CITY_ADMIN + OPERATIONS_EXECUTIVE + CARE_MANAGER ──
// blockNonManagement allows: SUPER_ADMIN, CITY_ADMIN, OPERATIONS_EXECUTIVE
// City Admin sees profiles filtered by city on the frontend via cityId param
router.get('/profiles',              blockNonManagement, ctrl.getProfiles);
router.get('/profiles/metadata',     blockNonManagement, ctrl.getMetadata);
router.post('/profiles/upload-url',  blockNonManagement, ctrl.requestUploadUrl);

// Write operations on profiles: SUPER_ADMIN only (global config changes)
router.put('/profiles/metadata',     authorize('SUPER_ADMIN'), auditMiddleware('Admin'), ctrl.updateMetadata);
router.post('/profiles',             authorize('SUPER_ADMIN'), auditMiddleware('Admin'), ctrl.createProfile);
router.post('/profiles/bulk-status', authorize('SUPER_ADMIN'), auditMiddleware('Admin'), ctrl.bulkUpdateStatus);
router.post('/profiles/bulk-delete', authorize('SUPER_ADMIN'), auditMiddleware('Admin'), ctrl.bulkDelete);
router.delete('/profiles/:id',       authorize('SUPER_ADMIN'), auditMiddleware('Admin'), ctrl.deleteProfile);
router.put('/profiles/:id',          authorize('SUPER_ADMIN'), auditMiddleware('Admin'), ctrl.updateProfile);

module.exports = router;
