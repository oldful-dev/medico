// Media Routes
const router = require('express').Router();
const { authenticate, authenticateAdmin } = require('../middleware/auth');
const { authorize } = require('../middleware/rbac');
const upload = require('../middleware/upload');
const ctrl = require('../controllers/media.controller');

// ─── Signed URL flow (preferred — no file bytes through Node.js) ───
router.post('/signed-url', authenticate, ctrl.requestSignedUrl);
router.post('/confirm',    authenticate, ctrl.confirmUpload);

// ─── Proxy upload (fallback) ───
router.post('/upload', authenticate, upload.single('file'), ctrl.uploadMedia);

// ─── Admin: list all assets ───
// Same roles blockNonManagement granted (SUPER_ADMIN, CITY_ADMIN,
// OPERATIONS_EXECUTIVE), plus CONTENT_ADMIN — an isolated role scoped to
// banners/media only, added explicitly here rather than by widening the
// shared blockNonManagement helper (which also gates unrelated management
// routes CONTENT_ADMIN must not reach).
const MEDIA_ROLES = ['SUPER_ADMIN', 'CITY_ADMIN', 'OPERATIONS_EXECUTIVE', 'CONTENT_ADMIN'];

router.get('/folders', authenticateAdmin, authorize(...MEDIA_ROLES), ctrl.getMediaFolders);
router.get('/',     authenticateAdmin, authorize(...MEDIA_ROLES), ctrl.getMediaAssets);
router.delete('/:id', authenticateAdmin, authorize(...MEDIA_ROLES), ctrl.deleteMedia);

module.exports = router;
