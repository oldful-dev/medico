// Webhook Routes (Razorpay)
const router = require('express').Router();
const express = require('express');
const ctrl = require('../controllers/webhook.controller');
const redcliffeWebhooks = require('../controllers/redcliffeWebhook.controller');

// Raw body parsing for webhook signature verification
router.use(express.raw({ type: 'application/json' }));
router.post('/razorpay', ctrl.razorpayWebhook);
router.post('/redcliffe', redcliffeWebhooks.handleRedcliffeWebhook);

module.exports = router;
