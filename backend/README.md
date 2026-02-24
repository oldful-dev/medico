# 🏥 Medico Backend — REST API

**Production-ready monolithic REST API for the Medico Healthcare Platform.**

Built with **Node.js + Express + Prisma + PostgreSQL (Supabase)**.

---

## 🏗 Architecture Overview

```
medico-backend/
├── prisma/
│   ├── schema.prisma          # 23 database models with full relations
│   └── seed.js                # Database seed (cities, admins, services, plans)
├── src/
│   ├── config/                # Database, Cloudinary, Razorpay, Logger
│   ├── controllers/           # 16 controller files (all business logic)
│   ├── cron/                  # 4 background jobs (node-cron)
│   ├── middleware/            # Auth, RBAC, Audit, Upload, Validation, Error
│   ├── routes/                # 22 route files
│   ├── utils/                 # Helpers, PDF gen, Notifications, File upload
│   └── server.js              # Express entry point
├── .env.example               # Environment variable template
└── package.json
```

---

## 🧩 Core Modules (All 15 Implemented)

| # | Module | Key Endpoints | Features |
|---|--------|--------------|----------|
| 1 | **Authentication** | `/api/auth/*` | Admin login, User OTP, JWT access+refresh, RBAC |
| 2 | **City Management** | `/api/cities/*` | CRUD, enable/disable, coming soon, revenue agg |
| 3 | **User Management** | `/api/users/*` | CRUD, auto-ID gen, emergency contacts, medical card, health reports, SLA PDF, block/suspend |
| 4 | **Service Management** | `/api/services/*` | CRUD, sort reorder, toggle, hero image, dynamic form JSON |
| 5 | **Booking Management** | `/api/bookings/*` | Create, assign/reassign caregiver, status flow, SLA breach, escalation, city-filter |
| 6 | **Caregiver Management** | `/api/caregivers/*` | CRUD, doc upload, police verification, availability, performance, salary |
| 7 | **Plan & Subscription** | `/api/plans/*` `/api/subscriptions/*` | Plan CRUD, activate/pause/resume/extend/cancel, auto-renew, compassionate clause |
| 8 | **Payment & Invoice** | `/api/payments/*` | Razorpay order, signature verify, GST invoice PDF, email dispatch, refund, coupons |
| 9 | **SOS Emergency** | `/api/sos/*` | Create alert with GPS, assign responder, notify admin+family via WhatsApp, resolve |
| 10 | **Notifications** | `/api/notifications/*` | Email/WhatsApp templates, logs, city-targeted campaigns |
| 11 | **Legal CMS** | `/api/legal/*` | T&C, Privacy, Refund, Disclaimer — draft/publish, version history |
| 12 | **Wellness Store** | `/api/products/*` `/api/categories/*` | Product/Category CRUD, stock, waitlist |
| 13 | **Reports & Analytics** | `/api/reports/*` | Revenue by city/plan, service usage, caregiver perf, refund analysis, retention, CSV export |
| 14 | **Audit Logs** | `/api/audit-logs/*` | Admin action logging with old/new value diff |
| 15 | **Server-Driven UI** | `/api/ui-config/*` | Config JSON, icons, banners, CTA, sort, visibility, publish versioning |

**Bonus modules:** Insurance, Support Tickets, Media Library, Razorpay Webhooks

---

## 🗄 Database Models (23 Tables)

```
Admin, City, User, Address, EmergencyContact, MedicalCard, HealthReport,
Service, Booking, Caregiver, Plan, Subscription, Payment, Invoice,
SOSAlert, NotificationLog, NotificationTemplate, LegalDocument,
Product, Category, WaitlistEntry, AuditLog, UIConfig,
InsuranceApplication, Coupon, MediaAsset, SupportTicket, TicketMessage
```

---

## 🔐 Authentication & Authorization

- **Admin Auth**: Email + Password → JWT (access + refresh tokens)
- **App User Auth**: Phone + OTP → JWT (access + refresh tokens)
- **RBAC Roles**: `SUPER_ADMIN`, `CITY_ADMIN`, `CARE_MANAGER`, `SUPPORT_AGENT`, `BILLING_EXECUTIVE`
- **City Restriction**: Non-SUPER_ADMIN admins only see data from their assigned city

---

## ⚙️ Background Jobs (node-cron)

| Job | Schedule | Description |
|-----|----------|-------------|
| Plan Expiry Reminder | Daily 9 AM | WhatsApp + Email for 7-day and 3-day expiry |
| Subscription Auto-Renew | Daily 1 AM | Auto-creates new subscription for auto-renew users |
| SLA Breach Checker | Every 30 min | Flags bookings past their SLA deadline |
| Expired Cleanup | Daily 2 AM | Marks expired subscriptions |

---

## 🚀 Quick Start

### 1. Clone & Install
```bash
cd medico-backend
npm install
```

### 2. Configure Environment
```bash
cp .env.example .env
# Edit .env with your Supabase, Razorpay, Cloudinary, SendGrid keys
```

### 3. Database Setup
```bash
npx prisma generate        # Generate Prisma client
npx prisma migrate dev      # Run migrations
npm run prisma:seed         # Seed initial data
```

### 4. Run Development Server
```bash
npm run dev                 # Starts on port 5000 with nodemon
```

### 5. Default Admin Login
```
Email: superadmin@medico.care
Password: admin123
```

---

## 📡 API Endpoint Summary

### Auth
```
POST /api/auth/admin/login       → Admin login
POST /api/auth/admin/register    → Create admin (SUPER_ADMIN only)
POST /api/auth/admin/refresh     → Refresh admin token
POST /api/auth/request-otp       → Send OTP to phone
POST /api/auth/verify-otp        → Verify OTP
POST /api/auth/user/refresh      → Refresh user token
POST /api/auth/logout            → Logout
```

### Users
```
GET    /api/users                → List users (admin)
GET    /api/users/:id            → Get user detail (admin)
POST   /api/users                → Create user
PUT    /api/users/:id            → Update user (admin)
PUT    /api/users/:id/block      → Block user
PUT    /api/users/:id/suspend    → Suspend user
PUT    /api/users/:id/activate   → Activate user
GET    /api/users/profile        → Get own profile (app)
PUT    /api/users/profile        → Update own profile (app)
POST   /api/users/:id/emergency-contacts
POST   /api/users/:id/addresses
POST   /api/users/:id/medical-card
POST   /api/users/:id/health-reports  (file upload)
```

### Bookings
```
GET    /api/bookings             → List bookings (admin)
GET    /api/bookings/:id         → Get booking
POST   /api/bookings             → Create booking
PUT    /api/bookings/:id/assign  → Assign caregiver
PUT    /api/bookings/:id/status  → Update status
PUT    /api/bookings/:id/escalate
GET    /api/bookings/history     → My bookings (app)
POST   /api/bookings/:id/cancel  → Cancel booking (app)
```

### Payments
```
GET    /api/payments/methods     → Payment methods
POST   /api/payments/initiate    → Create Razorpay order
POST   /api/payments/verify      → Verify payment
POST   /api/payments/apply-coupon
POST   /api/payments/refund      → Initiate refund (admin)
POST   /api/webhooks/razorpay    → Razorpay webhook
```

### Reports
```
GET    /api/reports/dashboard
GET    /api/reports/revenue-by-city
GET    /api/reports/revenue-by-plan
GET    /api/reports/service-usage
GET    /api/reports/caregiver-performance
GET    /api/reports/refund-analysis
GET    /api/reports/customer-retention
GET    /api/reports/csv/:type    → CSV export
```

---

## 🧪 Tech Stack

| Component | Technology |
|-----------|-----------|
| Runtime | Node.js |
| Framework | Express.js |
| ORM | Prisma |
| Database | PostgreSQL (Supabase) |
| Auth | JWT + bcrypt |
| Payments | Razorpay |
| File Storage | Cloudinary |
| PDF Engine | PDFKit |
| Cron | node-cron |
| Email | SendGrid |
| WhatsApp | Interakt API |
| Logging | Winston + Morgan |
| Validation | express-validator |
| Security | Helmet + CORS + Rate Limiting |

---

## 📋 Compliance

- ✅ GST Invoice format (18% GST)
- ✅ User ID generation: `MED-{CITY}-{SEQ}`
- ✅ Medical data secure storage (encrypted DB)
- ✅ Audit logging on all admin mutations
- ✅ Data retention via soft-delete patterns
