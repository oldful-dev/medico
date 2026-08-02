// Media Routes
const router = require('express').Router();
const { authenticate, authenticateAdmin } = require('../middleware/auth');
const { blockNonManagement } = require('../middleware/rbac');
const upload = require('../middleware/upload');
const ctrl = require('../controllers/media.controller');

// ─── Signed URL flow (preferred — no file bytes through Node.js) ───
router.post('/signed-url', authenticate, ctrl.requestSignedUrl);
router.post('/confirm',    authenticate, ctrl.confirmUpload);

// ─── Proxy upload (fallback) ───
router.post('/upload', authenticate, upload.single('file'), ctrl.uploadMedia);

// ─── Admin: list all assets (SUPER_ADMIN, CITY_ADMIN, OPERATIONS_EXECUTIVE) ───
router.get('/',     authenticateAdmin, blockNonManagement, ctrl.getMediaAssets);
router.delete('/:id', authenticateAdmin, blockNonManagement, ctrl.deleteMedia);

module.exports = router;
