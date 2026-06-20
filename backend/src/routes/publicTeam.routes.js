// Public Team Routes
const router = require('express').Router();
const ctrl = require('../controllers/publicTeam.controller');

router.get('/', ctrl.getPublicTeam);

module.exports = router;
