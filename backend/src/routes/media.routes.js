// Media Routes
const router = require('express').Router();
const { authenticate, authenticateAdmin } = require('../middleware/auth');
const upload = require('../middleware/upload');
const ctrl = require('../controllers/media.controller');

// ─── Signed URL flow (preferred — no file bytes through Node.js) ───
// Step 1: Get a GCS signed upload URL
router.post('/signed-url', authenticate, ctrl.requestSignedUrl);
// Step 2: Confirm after client has PUT file directly to GCS
router.post('/confirm', authenticate, ctrl.confirmUpload);

// ─── Proxy upload (fallback — file bytes through Node.js server) ───
router.post('/upload', authenticate, upload.single('file'), ctrl.uploadMedia);

// ─── Admin: list all assets ───────────────────────────────────────
router.get('/', authenticateAdmin, ctrl.getMediaAssets);

// ─── Admin: delete asset (storage + CDN + DB) ────────────────────
router.delete('/:id', authenticateAdmin, ctrl.deleteMedia);

module.exports = router;
