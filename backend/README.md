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

## 📡 Comprehensive API Documentation

All routes are prefixed with `/api`. Authentication is required unless marked as **[Public]**.

### 🔐 1. Authentication
- `POST   /auth/admin/login`     → [Public] Admin login (Email + Pwd)
- `POST   /auth/admin/register`  → Create new admin (**SUPER_ADMIN** only)
- `POST   /auth/admin/refresh`   → Refresh admin JWT access token
- `POST   /auth/request-otp`     → [Public] Send OTP to phone for user login
- `POST   /auth/verify-otp`      → [Public] Verify OTP & return user JWT
- `POST   /auth/user/refresh`    → Refresh mobile user JWT
- `POST   /auth/logout`          → Invalidate current session

### 👥 2. User Management
- `GET    /users`                → List all users (**Admin**, city-restricted)
- `GET    /users/:id`            → Get full user profile & relations (**Admin**)
- `POST   /users`                → [Public] Initialize user profile
- `PUT    /users/:id`            → Update user metadata (**Admin**)
- `PUT    /users/:id/block`      → Block login/booking (**SUPER/CITY ADMIN**)
- `PUT    /users/:id/suspend`    → Soft-suspend account (**SUPER/CITY ADMIN**)
- `PUT    /users/:id/activate`   → Reactivate account (**Admin**)
- `GET    /users/profile`        → Get own profile (**User self**)
- `PUT    /users/profile`        → Update own profile (**User self**)
- `PUT    /users/profile/avatar` → Upload profile image (**User self**, Multipart)
- `POST   /users/:id/emergency-contacts` → Add contact (User/Admin)
- `DELETE /users/:uId/emergency-contacts/:cId` → Remove contact
- `POST   /users/:id/addresses`  → Add saved address
- `POST   /users/:id/medical-card` → Upsert medical history data
- `POST   /users/:id/health-reports` → Upload lab report (**Multipart**)

### 🏢 3. City & Region
- `GET    /cities`               → [Public] List active cities for app
- `GET    /cities/:id`           → Get city detail
- `POST   /cities`               → Create city (**SUPER_ADMIN**)
- `PUT    /cities/:id`           → Update city/enable/disable (**Admin**)
- `GET    /cities/:id/revenue`   → Get city-specific revenue metrics

### 🩺 4. Services (App Interface)
- `GET    /services`             → [Public] List active services with UI config
- `GET    /services/:id`         → [Public] Service detail & form schema
- `POST   /services`             → Create service with dynamic form schema (**Admin**)
- `PUT    /services/reorder`     → Update display sequence in app (**Admin**)
- `PUT    /services/:id/toggle`  → Enable/Disable service (**Admin**)
- `POST   /services/:id/hero-image` → Upload service banner (**Admin**)

### 📅 5. Bookings & SLA
- `GET    /bookings`             → List all bookings (**Admin**, city-restricted)
- `GET    /bookings/:id`         → Get booking detail & notes
- `POST   /bookings`             → Create new booking (User/Admin)
- `GET    /bookings/history`     → My booking history (**User self**)
- `POST   /bookings/:id/cancel`  → Cancel booking (**User self**)
- `PUT    /bookings/:id/assign`  → Assign caregiver + trigger WhatsApp (**Admin**)
- `PUT    /bookings/:id/status`  → Update status (e.g. IN_PROGRESS → COMPLETED)
- `PUT    /bookings/:id/escalate`→ Flag booking for immediate attention (**Admin**)

### 🧑‍⚕️ 6. Caregiver Management
- `GET    /caregivers`           → List caregivers (**Admin**, city-restricted)
- `POST   /caregivers`           → Register new caregiver (**Admin**)
- `PUT    /caregivers/:id/verification` → Update Police/Doc verification status
- `PUT    /caregivers/:id/availability` → Toggle online/offline
- `POST   /caregivers/:id/documents` → Upload verification documents (**Multipart**)

### 💎 7. Plans & Subscriptions
- `GET    /plans`                → [Public] List membership levels
- `POST   /plans`                → Create/Update plan pricing (**Admin**)
- `GET    /subscriptions`        → List all active/expired subs (**Admin**)
- `POST   /subscriptions`        → Create subscription for user (**Admin**)
- `PUT    /subscriptions/:id/pause` → Pause membership (e.g. user traveling)
- `PUT    /subscriptions/:id/compassionate` → Add free extension days (**Admin**)

### 💳 8. Payments & Coupons
- `POST   /payments/initiate`    → Create Razorpay order
- `POST   /payments/verify`      → Verify signature & generate PDF Invoice
- `POST   /payments/apply-coupon`→ Validate and apply discount
- `POST   /payments/refund`      → Initiate refund via Razorpay (**Admin**)
- `GET    /payments/:id/refund-status` → Check refund progress

### 🚨 9. SOS Emergency
- `POST   /sos`                  → Create high-priority alert with GPS (**User**)
- `GET    /sos`                  → Monitor live alerts dashboard (**Admin**)
- `PUT    /sos/:id/assign`       → Dispatch responder to user location
- `PUT    /sos/:id/resolve`      → Mark incident as closed with notes

### 📦 10. Wellness Store
- `GET    /products`             → [Public] List store items
- `POST   /products/:id/waitlist`→ Join out-of-stock notification list
- `GET    /categories`           → [Public] List product categories
- `POST   /products`             → Manage inventory (**Admin**)

### 📄 11. Legal & CMS
- `GET    /legal/published/:type`→ [Public] Get T&C / Privacy Policy
- `POST   /legal`                → Create new draft of legal doc (**Admin**)
- `PUT    /legal/:id/publish`    → Push new version to live app (**Admin**)

### 📊 12. Reports & Analytics
- `GET    /reports/dashboard`    → Global revenue/user stats
- `GET    /reports/revenue-by-city`
- `GET    /reports/service-usage`
- `GET    /reports/csv/:type`    → Export data to CSV (**Admin**)

### 🔍 13. Audit & System
- `GET    /audit-logs`           → View historical admin actions (**SUPER_ADMIN**)
- `GET    /ui-config/published`  → [Public] Fetch live Server-Driven UI config
- `POST   /ui-config/publish`    → Update app banners/icons/routes (**Admin**)
- `GET    /notifications/logs`   → Audit trail of WhatsApp/Email sent


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
