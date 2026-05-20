const express = require('express');
const ctrl = require('../controllers/familyMember.controller');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

// All routes require authentication
router.use(authenticate);

// GET /api/users/:userId/family-members
router.get('/:userId/family-members', ctrl.getFamilyMembers);

// POST /api/users/:userId/family-members
router.post('/:userId/family-members', ctrl.addFamilyMember);

// PUT /api/users/:userId/family-members/:memberId
router.put('/:userId/family-members/:memberId', ctrl.updateFamilyMember);

// DELETE /api/users/:userId/family-members/:memberId
router.delete('/:userId/family-members/:memberId', ctrl.deleteFamilyMember);

module.exports = router;
