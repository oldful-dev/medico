// Webhook Routes (Razorpay)
const router = require('express').Router();
const express = require('express');
const ctrl = require('../controllers/webhook.controller');

// Raw body parsing for webhook signature verification
router.use(express.raw({ type: 'application/json' }));
router.post('/razorpay', ctrl.razorpayWebhook);

module.exports = router;
