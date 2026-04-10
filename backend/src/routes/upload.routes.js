// ──────────────────────────────────────────────
//  Upload Routes
//  Pipeline: GCS → OCR → R2 → CDN URL
// ──────────────────────────────────────────────

const router = require('express').Router();
const { authenticate } = require('../middleware/auth');
const upload = require('../middleware/upload');
const ctrl = require('../controllers/upload.controller');

// POST /api/upload — Full pipeline (single file)
// file → GCS raw → compress → OCR → R2 → CDN URL
router.post('/', authenticate, upload.single('file'), ctrl.fullUpload);

// POST /api/upload/quick — Quick upload (GCS only, no OCR/R2)
router.post('/quick', authenticate, upload.single('file'), ctrl.quickUploadHandler);

// POST /api/upload/batch — Multiple files (up to 10)
router.post('/batch', authenticate, upload.array('files', 10), ctrl.batchUpload);

// POST /api/upload/process-existing — Run OCR on an already-uploaded file
router.post('/process-existing', authenticate, ctrl.processExisting);

module.exports = router;
