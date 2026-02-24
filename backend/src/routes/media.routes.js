// Media Routes
const router = require('express').Router();
const { authenticateAdmin } = require('../middleware/auth');
const upload = require('../middleware/upload');
const ctrl = require('../controllers/media.controller');

router.use(authenticateAdmin);

router.get('/', ctrl.getMediaAssets);
router.post('/upload', upload.single('file'), ctrl.uploadMedia);
router.delete('/:id', ctrl.deleteMedia);

module.exports = router;
