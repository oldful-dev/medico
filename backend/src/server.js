// ══════════════════════════════════════════════════════════════
//  Ayuxa Backend — Production Server
//
//  Security layers:
//    1. Helmet (HTTP headers)
//    2. CORS (origin whitelist)
//    3. Rate limiting (global + per-endpoint)
//    4. Body size limits
//    5. Request logging
//
//  Rate limit tiers:
//    Global API:      200 req / 15 min / IP
//    Auth (OTP):      3 req / 10 min / phone (in auth.routes.js)
//    Auth (login):    10 req / 15 min / IP
//    Payments:        30 req / 15 min / user
//    Uploads:         20 req / 15 min / user
//    SDUI config:     100 req / 5 min / IP (cached at edge anyway)
// ══════════════════════════════════════════════════════════════

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const cookieParser = require('cookie-parser');
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
const labRoutes = require('./routes/lab.routes');
const bannerRoutes = require('./routes/banner.routes');
const faqRoutes = require('./routes/faq.routes');
const locationRoutes = require('./routes/location.routes');
const remoteConfigRoutes = require('./routes/remoteConfig.routes');
const appConfigRoutes = require('./routes/appConfig.routes');
const uploadRoutes = require('./routes/upload.routes');
const waitlistRoutes = require('./routes/waitlist.routes');
const sessionRoutes = require('./routes/session.routes');
const analyticsRoutes = require('./routes/analytics.routes');
const whatsappTestRoutes = require('./routes/whatsapp-test.routes');
const serviceChargeRoutes = require('./routes/serviceCharge.routes');
const activityRoutes = require('./routes/activity.routes');
const familyMemberRoutes = require('./routes/familyMember.routes');
const meetupRoutes = require('./routes/meetup.routes');
const orderRoutes = require('./routes/order.routes');

// Initialize cron jobs
const { initCronJobs } = require('./cron');

const app = express();
const PORT = process.env.PORT || 5000;

// ═══ TRUST PROXY (required behind Cloudflare/Render/load balancer) ═══
// This ensures req.ip returns the real client IP, not the proxy IP.
// Cloudflare sets X-Forwarded-For; Render sets it too.
app.set('trust proxy', 1);
app.use(cookieParser(process.env.JWT_SECRET));

// ─── SECURITY HEADERS ──────────────────────────────────────────
app.use(helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' }, // Allow CDN-served assets
    contentSecurityPolicy: false, // Managed at Cloudflare edge
}));

// ─── CORS ───────────────────────────────────────────────
const ALLOWED_ORIGINS = [
    process.env.ADMIN_FRONTEND_URL,
    process.env.APP_FRONTEND_URL,
    process.env.WEB_FRONTEND_URL,
    'https://assets.ayuxa.com',
    'https://ayuxa.com',
    'https://www.ayuxa.com',
    'https://ayuxacare.com',
    'https://www.ayuxacare.com',
    'http://localhost:3000',
    'http://localhost:3001',
    'http://localhost:3003',
    'http://localhost:8081',
].filter(Boolean);

app.use(cors({
    origin: (origin, callback) => {
        // Allow requests with no origin (mobile apps, server-to-server, health checks)
        if (!origin) return callback(null, true);

        const isAllowed = ALLOWED_ORIGINS.includes(origin) ||
            origin.includes('localhost') ||
            origin.includes('127.0.0.1') ||
            /^http:\/\/192\.168\.\d+\.\d+(:\d+)?$/.test(origin); // Local network IP

        if (isAllowed) {
            callback(null, true);
        } else {
            logger.warn(`🚫 CORS blocked: ${origin}`);
            callback(null, false);
        }
    },
    credentials: true,
    maxAge: 86400, // Cache preflight for 24h
}));

// ═══ RATE LIMITING ══════════════════════════════════════════
// Global: 200 requests per 15 minutes per IP
const globalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 200,
    standardHeaders: true,
    legacyHeaders: false,
    message: { success: false, message: 'Too many requests. Please try again later.' },
    // Skip rate limiting for health checks
    skip: (req) => req.path === '/api/health',
});
app.use('/api/', globalLimiter);

// Auth endpoints: 10 requests per 15 minutes (OTP has its own stricter limiter in auth.routes.js)
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 30, // Increased from 10 to 30
    standardHeaders: true,
    legacyHeaders: false,
    message: { success: false, message: 'Too many auth attempts. Please try again later.' },
});

// Payment endpoints: 30 requests per 15 minutes
const paymentLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 30,
    standardHeaders: true,
    legacyHeaders: false,
    message: { success: false, message: 'Too many payment requests. Please slow down.' },
});

// Upload endpoints: 20 requests per 15 minutes
const uploadLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 20,
    standardHeaders: true,
    legacyHeaders: false,
    message: { success: false, message: 'Upload rate limit exceeded. Please try again later.' },
});

// ═══ WEBHOOK ROUTES (raw body needed before json parse) ═════
app.use('/api/webhooks', webhookRoutes);

// ═══ BODY PARSING ═══════════════════════════════════════════
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ═══ LOGGING ════════════════════════════════════════════════
app.use(morgan(':method :url :status :response-time ms - :remote-addr', {
    stream: { write: (message) => logger.info(message.trim()) },
    // Skip logging for health checks in production
    skip: (req) => process.env.NODE_ENV === 'production' && req.path === '/api/health',
}));

// ═══ HEALTH CHECK ═══════════════════════════════════════════
app.get('/api/health', async (req, res) => {
    // Basic health — always fast
    const health = {
        success: true,
        message: 'Ayuxa API is running',
        version: '2.0.0',
        timestamp: new Date().toISOString(),
        uptime: Math.floor(process.uptime()),
    };

    // Deep health check (storage connectivity) — only if ?deep=true
    if (req.query.deep === 'true') {
        try {
            const { healthCheck } = require('./utils/storage.service');
            health.storage = await healthCheck();
        } catch (err) {
            health.storage = { error: err.message };
        }
    }

    res.json(health);
});

// ═══ API ROUTES ═════════════════════════════════════════════
// Auth (with stricter rate limiting)
app.use('/api/auth', authLimiter, authRoutes);

// Admin tools (mounted before generic /api/admin to prevent parameter shadowing)
app.use('/api/admin/service-charges', serviceChargeRoutes);

// Admin
app.use('/api/admin', adminRoutes);
app.use('/api/sessions', sessionRoutes);

// Core
app.use('/api/cities', cityRoutes);
app.use('/api/users', userRoutes);
app.use('/api/users', familyMemberRoutes);
app.use('/api/services', serviceRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/caregivers', caregiverRoutes);
app.use('/api/public/team', require('./routes/publicTeam.routes'));

// Subscriptions & Payments (with payment rate limiter)
app.use('/api/plans', planRoutes);
app.use('/api/subscriptions', subscriptionRoutes);
app.use('/api/payments', paymentLimiter, paymentRoutes);
app.use('/api/checkout', require('./routes/checkout.routes'));


// Communication
app.use('/api/sos', sosRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/support', supportRoutes);
app.use('/api/whatsapp-test', whatsappTestRoutes);

// Content
app.use('/api/legal', legalRoutes);
app.use('/api/products', productRoutes);
app.use('/api/categories', categoryRoutes);

// Media & Uploads (with upload rate limiter)
app.use('/api/media', uploadLimiter, mediaRoutes);
app.use('/api/upload', uploadLimiter, uploadRoutes);

// Config & SDUI
app.use('/api/ui-config', uiConfigRoutes);
app.use('/api/remote-config', remoteConfigRoutes);
app.use('/api/app-config', appConfigRoutes);

// Admin tools
app.use('/api/audit-logs', auditRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/insurance', insuranceRoutes);
app.use('/api/labs', labRoutes);
app.use('/api/activity', activityRoutes);
app.use('/api/location', locationRoutes);
app.use('/api/waitlist', waitlistRoutes);

// Banners (public + admin)
app.use('/api/banners', bannerRoutes);

// FAQs (public + admin)
app.use('/api/faqs', faqRoutes);

// Local Meetups
app.use('/api/meetups', meetupRoutes);

// Wellness Store
app.use('/api/wellness', require('./routes/wellness.routes'));

// Orders (Shiprocket logistics)
app.use('/api/orders', paymentLimiter, orderRoutes);


// ═══ ERROR HANDLING ═════════════════════════════════════════
app.use(notFoundHandler);
app.use(errorHandler);

const http = require('http');
const socketService = require('./services/socket.service');

// Create HTTP server
const server = http.createServer(app);

// Initialize Socket.io
socketService.init(server);
logger.info('🔌 Socket.io initialized');

// ═══ START SERVER ═══════════════════════════════════════════
server.listen(PORT, '0.0.0.0', () => {
    logger.info(`🚀 Ayuxa Backend running on port ${PORT}`);
    logger.info(`📋 Environment: ${process.env.NODE_ENV}`);
    logger.info(`🔒 Trust proxy: enabled`);

    // Initialize background cron jobs
    initCronJobs();
    logger.info('⏰ Cron jobs initialized');
});

module.exports = app;
