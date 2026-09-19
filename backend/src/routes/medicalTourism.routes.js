// Medical Tourism Enquiry Tracking Routes — admin only
const router = require('express').Router();
const { authenticateAdmin } = require('../middleware/auth');
const { blockNonOperational } = require('../middleware/rbac');
const { auditMiddleware } = require('../middleware/audit');
const ctrl = require('../controllers/medicalTourism.controller');

router.get('/enquiries', authenticateAdmin, ctrl.getEnquiries);
router.get('/enquiries/:id', authenticateAdmin, ctrl.getEnquiryById);
router.get('/enquiries/:id/documents/:index/view-url', authenticateAdmin, ctrl.getDocumentViewUrl);
router.put('/enquiries/:id', authenticateAdmin, blockNonOperational, auditMiddleware('MedicalTourismEnquiry'), ctrl.updateEnquiry);

module.exports = router;
