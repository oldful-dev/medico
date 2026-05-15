// ──────────────────────────────────────────────
//  WhatsApp Test Routes
//  Admin-only endpoints for testing Fast2SMS WABA
// ──────────────────────────────────────────────

const express = require('express');
const router = express.Router();
const { authenticateAdmin } = require('../middleware/auth');
const {
    diagnoseFast2SMS,
    testSingleTemplate,
    testAllTemplatesEndpoint,
    listTemplates,
} = require('../controllers/whatsapp-test.controller');

// All routes require admin authentication
router.use(authenticateAdmin);

/**
 * GET /api/whatsapp-test/templates
 * List all available WABA templates
 */
router.get('/templates', listTemplates);

/**
 * POST /api/whatsapp-test/diagnose
 * Check Fast2SMS connection
 */
router.post('/diagnose', diagnoseFast2SMS);

/**
 * POST /api/whatsapp-test/single
 * Test a single template
 * Body: {
 *   templateId: number,
 *   phoneNumber: string,
 *   variables: string[]
 * }
 */
router.post('/single', testSingleTemplate);

/**
 * POST /api/whatsapp-test/all
 * Test all 12 templates
 * Body: {
 *   phoneNumber: string
 * }
 */
router.post('/all', testAllTemplatesEndpoint);

module.exports = router;
