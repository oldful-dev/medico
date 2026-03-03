// ──────────────────────────────────────────────
//  Oldful Backend — Main Server Entry Point
// ──────────────────────────────────────────────

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');

const { logger } = require('./config/logger');
const { errorHandler, notFoundHandler } = require('./middleware/errorHandler');

// Import route modules
const authRoutes = require('./routes/auth.routes');
const adminRoutes = require('./routes/admin.routes');
const cityRoutes = require('./routes/city.routes');
const userRoutes = require('./routes/user.routes');
const serviceRoutes = require('./routes/service.routes');
const bookingRoutes = require('./routes/booking.routes');
const caregiverRoutes = require('./routes/caregiver.routes');
const planRoutes = require('./routes/plan.routes');
const subscriptionRoutes = require('./routes/subscription.routes');
const paymentRoutes = require('./routes/payment.routes');
const sosRoutes = require('./routes/sos.routes');
const notificationRoutes = require('./routes/notification.routes');
const legalRoutes = require('./routes/legal.routes');
const productRoutes = require('./routes/product.routes');
const categoryRoutes = require('./routes/category.routes');
const auditRoutes = require('./routes/audit.routes');
const uiConfigRoutes = require('./routes/uiConfig.routes');
const reportRoutes = require('./routes/report.routes');
const insuranceRoutes = require('./routes/insurance.routes');
const supportRoutes = require('./routes/support.routes');
const mediaRoutes = require('./routes/media.routes');
const webhookRoutes = require('./routes/webhook.routes');

// Initialize cron jobs
const { initCronJobs } = require('./cron');

const app = express();
const PORT = process.env.PORT || 5000;

// ─── Security ───────────────────────────────────────────
app.use(helmet());

// ─── CORS ───────────────────────────────────────────────
app.use(cors({
  origin: [
    process.env.ADMIN_FRONTEND_URL || 'http://localhost:3001',
    process.env.APP_FRONTEND_URL || 'http://localhost:8081',
  ],
  credentials: true,
}));

// ─── Rate Limiting ──────────────────────────────────────
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 200,
  message: { success: false, message: 'Too many requests, please try again later.' },
});
app.use('/api/', limiter);

// ─── Webhook route (raw body needed before json parse) ──
app.use('/api/webhooks', webhookRoutes);

// ─── Body Parsing ───────────────────────────────────────
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// ─── Logging ────────────────────────────────────────────
app.use(morgan('combined', {
  stream: { write: (message) => logger.info(message.trim()) },
}));

// ─── Health Check ───────────────────────────────────────
app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    message: 'Oldful API is running',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
  });
});

// ─── API Routes ─────────────────────────────────────────
app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/cities', cityRoutes);
app.use('/api/users', userRoutes);
app.use('/api/services', serviceRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/caregivers', caregiverRoutes);
app.use('/api/plans', planRoutes);
app.use('/api/subscriptions', subscriptionRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/sos', sosRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/legal', legalRoutes);
app.use('/api/products', productRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/audit-logs', auditRoutes);
app.use('/api/ui-config', uiConfigRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/insurance', insuranceRoutes);
app.use('/api/support', supportRoutes);
app.use('/api/media', mediaRoutes);

// ─── Error Handling ─────────────────────────────────────
app.use(notFoundHandler);
app.use(errorHandler);

// ─── Start Server ───────────────────────────────────────
app.listen(PORT, () => {
  logger.info(`🚀 Oldful Backend running on port ${PORT}`);
  logger.info(`📋 Environment: ${process.env.NODE_ENV}`);

  // Initialize background cron jobs
  initCronJobs();
  logger.info('⏰ Cron jobs initialized');
});

module.exports = app;
