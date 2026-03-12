// Media Routes
const router = require('express').Router();
const { authenticate, authenticateAdmin } = require('../middleware/auth');
const upload = require('../middleware/upload');
const ctrl = require('../controllers/media.controller');

// Admin only: List all media assets
router.get('/', authenticateAdmin, ctrl.getMediaAssets);

// Authenticated (User or Admin): Upload media
router.post('/upload', authenticate, upload.single('file'), ctrl.uploadMedia);

// Admin only: Delete media
router.delete('/:id', authenticateAdmin, ctrl.deleteMedia);

module.exports = router;
