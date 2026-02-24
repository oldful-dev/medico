// Caregiver Routes
const router = require('express').Router();
const { authenticateAdmin } = require('../middleware/auth');
const { cityRestriction } = require('../middleware/rbac');
const { auditMiddleware } = require('../middleware/audit');
const upload = require('../middleware/upload');
const ctrl = require('../controllers/caregiver.controller');

router.use(authenticateAdmin);

router.get('/', cityRestriction, ctrl.getCaregivers);
router.get('/:id', ctrl.getCaregiverById);
router.post('/', auditMiddleware('Caregiver'), ctrl.createCaregiver);
router.put('/:id', auditMiddleware('Caregiver'), ctrl.updateCaregiver);
router.put('/:id/verification', ctrl.updateVerification);
router.put('/:id/availability', ctrl.toggleAvailability);
router.post('/:id/documents', upload.array('files', 10), ctrl.uploadDocuments);
router.delete('/:id', auditMiddleware('Caregiver'), ctrl.deleteCaregiver);

module.exports = router;
