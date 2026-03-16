# Oldful Backend — REST API

**Production monolithic REST API for the Oldful elder-care platform.**

Built with **Node.js + Express + Prisma + PostgreSQL (Supabase)**.

- **Production URL:** `https://medico-crzu.onrender.com`
- **Last route audit:** 2026-03-16

---

## Architecture

```
backend/
├── prisma/
│   ├── schema.prisma          # 24 database models with full relations
│   └── seed.js                # Database seed (cities, admins, services, plans)
├── src/
│   ├── config/                # Database, Razorpay, Logger
│   ├── controllers/           # 17 controller files
│   ├── cron/                  # 4 background jobs (node-cron)
│   ├── middleware/             # Auth, RBAC, Audit, Upload, Validation, Error
│   ├── routes/                # 23 route files
│   ├── utils/                 # Helpers, PDF gen, Notifications, Storage, Redcliffe, OCR
│   └── server.js              # Express entry point
├── .env.example
└── package.json
```

---

## Quick Start

```bash
cd backend
npm install
cp .env.example .env        # Fill in Supabase, Razorpay, Fast2SMS, ZeptoMail, R2 keys
npx prisma generate
npx prisma migrate deploy
npm run prisma:seed          # Creates super admin + seed data
npm run dev                  # Port 5000
```

**Default Admin (after seed):**
```
Email:    superadmin@medico.care
Password: admin123
```

---

## Authentication

| Method | Endpoint | Description |
|--------|----------|-------------|
| Admin | Email + Password → JWT | `POST /api/auth/admin/login` |
| User | Phone + OTP → JWT | `POST /api/auth/request-otp` → `POST /api/auth/verify-otp` |
| Tokens | Access: 15 min / Refresh: 7 days | |

**RBAC Roles:** `SUPER_ADMIN`, `CITY_ADMIN`, `CARE_MANAGER`, `SUPPORT_AGENT`, `BILLING_EXECUTIVE`

---

## Route Test Results (Audit: 2026-03-16)

All routes tested against production at `https://medico-crzu.onrender.com/api`.

Legend: ✅ Working · ⚠️ Warning · ❌ Broken · 🔒 Auth-guarded (returns 401 without token — correct)

---

### 🔐 Authentication — `/api/auth`

| Method | Route | Status | Notes |
|--------|-------|--------|-------|
| POST | `/auth/admin/login` | ⚠️ `401` | Route works. Returns "Invalid credentials" — **run `npm run prisma:seed` on production DB to create admin** |
| POST | `/auth/admin/register` | 🔒 `401` | Requires existing SUPER_ADMIN token |
| POST | `/auth/admin/refresh` | ⚠️ `400` | Route works. Returns validation error when body is empty (expected) |
| POST | `/auth/request-otp` | ❌ `200/500` | Route + validation work. **OTP delivery fails — Twilio Trial error. Deploy latest code (Fast2SMS branch) to fix** |
| POST | `/auth/verify-otp` | ⚠️ `422` | Route works. Returns validation error for empty body (expected) |
| POST | `/auth/user/refresh` | 🔒 `401` | Requires valid refresh token |
| POST | `/auth/logout` | 🔒 `401` | Requires auth |

**Issue:** Production is running old Twilio-based code. Local has been refactored to Fast2SMS. Push and redeploy to fix OTP.

---

### 👥 Users — `/api/users`

| Method | Route | Status | Notes |
|--------|-------|--------|-------|
| GET | `/users/profile` | 🔒 `401` | |
| PUT | `/users/profile` | 🔒 `401` | |
| PUT | `/users/profile/avatar` | 🔒 `401` | Multipart |
| PUT | `/users/profile/device-token` | 🔒 `401` | |
| GET | `/users/profile/health-reports` | 🔒 `401` | |
| GET | `/users` | 🔒 `401` | Admin, city-restricted |
| GET | `/users/:id` | 🔒 `401` | Admin |
| POST | `/users` | ❌ `500` | **Bug: crashes when `cityId` is not provided** — `generateUserId(undefined)` triggers Prisma error. Add `cityId` validation. |
| PUT | `/users/:id` | 🔒 `401` | Admin |
| PUT | `/users/:id/block` | 🔒 `401` | SUPER/CITY ADMIN |
| PUT | `/users/:id/suspend` | 🔒 `401` | |
| PUT | `/users/:id/activate` | 🔒 `401` | |
| POST | `/users/:id/emergency-contacts` | 🔒 `401` | |
| DELETE | `/users/:uId/emergency-contacts/:cId` | 🔒 `401` | |
| POST | `/users/:id/addresses` | 🔒 `401` | |
| PUT | `/users/:uId/addresses/:aId` | 🔒 `401` | |
| POST | `/users/:id/medical-card` | 🔒 `401` | |
| POST | `/users/:id/health-reports` | 🔒 `401` | Multipart |

---

### 🏢 Cities — `/api/cities`

| Method | Route | Status | Notes |
|--------|-------|--------|-------|
| GET | `/cities` | ✅ `200` | Returns 6 seeded cities |
| GET | `/cities/:id` | ✅ `200` | Returns city detail |
| POST | `/cities` | 🔒 `401` | SUPER_ADMIN |
| PUT | `/cities/:id` | 🔒 `401` | |
| DELETE | `/cities/:id` | 🔒 `401` | |
| GET | `/cities/:id/revenue` | 🔒 `401` | |

---

### 🩺 Services — `/api/services`

| Method | Route | Status | Notes |
|--------|-------|--------|-------|
| GET | `/services` | ✅ `200` | Returns 24 seeded services |
| GET | `/services/:id` | ✅ `200` | |
| POST | `/services` | 🔒 `401` | Admin |
| PUT | `/services/reorder` | 🔒 `401` | Admin |
| PUT | `/services/:id` | 🔒 `401` | Admin |
| PUT | `/services/:id/toggle` | 🔒 `401` | |
| POST | `/services/:id/hero-image` | 🔒 `401` | Multipart |
| DELETE | `/services/:id` | 🔒 `401` | |

---

### 📅 Bookings — `/api/bookings`

| Method | Route | Status | Notes |
|--------|-------|--------|-------|
| GET | `/bookings/history` | 🔒 `401` | User self |
| GET | `/bookings/detail/:id` | 🔒 `401` | User self |
| POST | `/bookings/:id/cancel` | 🔒 `401` | User self |
| GET | `/bookings` | 🔒 `401` | Admin, city-restricted |
| GET | `/bookings/:id` | 🔒 `401` | Admin |
| POST | `/bookings` | 🔒 `401` | User/Admin |
| PUT | `/bookings/:id/assign` | 🔒 `401` | Admin |
| PUT | `/bookings/:id/reassign` | 🔒 `401` | Admin |
| PUT | `/bookings/:id/status` | 🔒 `401` | Admin |
| PUT | `/bookings/:id/escalate` | 🔒 `401` | Admin |

---

### 🧑‍⚕️ Caregivers — `/api/caregivers`

| Method | Route | Status | Notes |
|--------|-------|--------|-------|
| GET | `/caregivers` | 🔒 `401` | Admin, city-restricted |
| GET | `/caregivers/:id` | 🔒 `401` | Admin |
| POST | `/caregivers` | 🔒 `401` | Admin |
| PUT | `/caregivers/:id` | 🔒 `401` | Admin |
| PUT | `/caregivers/:id/verification` | 🔒 `401` | |
| PUT | `/caregivers/:id/availability` | 🔒 `401` | |
| POST | `/caregivers/:id/documents` | 🔒 `401` | Multipart |
| DELETE | `/caregivers/:id` | 🔒 `401` | Admin |

---

### 💎 Plans — `/api/plans`

| Method | Route | Status | Notes |
|--------|-------|--------|-------|
| GET | `/plans` | ✅ `200` | Returns 4 seeded plans |
| GET | `/plans/:id` | ✅ `200` | |
| POST | `/plans` | 🔒 `401` | Admin |
| PUT | `/plans/:id` | 🔒 `401` | Admin |
| DELETE | `/plans/:id` | 🔒 `401` | Admin |

---

### 🔄 Subscriptions — `/api/subscriptions`

| Method | Route | Status | Notes |
|--------|-------|--------|-------|
| GET | `/subscriptions` | 🔒 `401` | Admin |
| POST | `/subscriptions` | 🔒 `401` | Admin |
| PUT | `/subscriptions/:id/pause` | 🔒 `401` | |
| PUT | `/subscriptions/:id/resume` | 🔒 `401` | |
| PUT | `/subscriptions/:id/extend` | 🔒 `401` | |
| PUT | `/subscriptions/:id/cancel` | 🔒 `401` | |
| PUT | `/subscriptions/:id/auto-renew` | 🔒 `401` | |
| PUT | `/subscriptions/:id/compassionate` | 🔒 `401` | |

---

### 💳 Payments — `/api/payments`

| Method | Route | Status | Notes |
|--------|-------|--------|-------|
| GET | `/payments/methods` | ✅ `200` | Returns UPI, Card, Netbanking, Wallet |
| POST | `/payments/initiate` | 🔒 `401` | User |
| POST | `/payments/verify` | 🔒 `401` | User |
| POST | `/payments/apply-coupon` | 🔒 `401` | User |
| GET | `/payments` | 🔒 `401` | Admin |
| POST | `/payments/refund` | 🔒 `401` | Admin |
| GET | `/payments/:id/refund-status` | 🔒 `401` | Admin |

---

### 🚨 SOS — `/api/sos`

| Method | Route | Status | Notes |
|--------|-------|--------|-------|
| POST | `/sos` | 🔒 `401` | User |
| GET | `/sos` | 🔒 `401` | Admin |
| PUT | `/sos/:id/assign` | 🔒 `401` | Admin |
| PUT | `/sos/:id/resolve` | 🔒 `401` | Admin |

---

### 🔔 Notifications — `/api/notifications`

| Method | Route | Status | Notes |
|--------|-------|--------|-------|
| GET | `/notifications/my` | 🔒 `401` | User — returns paginated notification history |
| GET | `/notifications/logs` | 🔒 `401` | Admin |
| GET | `/notifications/templates` | 🔒 `401` | Admin |
| POST | `/notifications/templates` | 🔒 `401` | Admin |
| PUT | `/notifications/templates/:id` | 🔒 `401` | Admin |
| DELETE | `/notifications/templates/:id` | 🔒 `401` | Admin |
| POST | `/notifications/send-campaign` | 🔒 `401` | Admin |

---

### 📄 Legal CMS — `/api/legal`

| Method | Route | Status | Notes |
|--------|-------|--------|-------|
| GET | `/legal/published/TERMS_AND_CONDITIONS` | ✅ `200` | |
| GET | `/legal/published/PRIVACY_POLICY` | ✅ `200` | |
| GET | `/legal/published/REFUND_POLICY` | ✅ `200` | |
| GET | `/legal/published/DISCLAIMER` | ✅ `200` | |
| GET | `/legal/published/TERMS` | ❌ `500` | **Wrong enum value** — use `TERMS_AND_CONDITIONS` not `TERMS`. Valid values: `TERMS_AND_CONDITIONS`, `PRIVACY_POLICY`, `REFUND_POLICY`, `DISCLAIMER` |
| GET | `/legal` | 🔒 `401` | Admin |
| GET | `/legal/:id` | 🔒 `401` | Admin |
| POST | `/legal` | 🔒 `401` | Admin |
| PUT | `/legal/:id` | 🔒 `401` | Admin |
| PUT | `/legal/:id/publish` | 🔒 `401` | Admin |

---

### 📦 Wellness Store — `/api/products` · `/api/categories`

| Method | Route | Status | Notes |
|--------|-------|--------|-------|
| GET | `/products` | ✅ `200` | Returns empty list (no products seeded) |
| GET | `/products/:id` | ✅ `200` | |
| POST | `/products/:id/waitlist` | 🔒 `401` | User |
| POST | `/products` | 🔒 `401` | Admin |
| PUT | `/products/:id` | 🔒 `401` | Admin |
| DELETE | `/products/:id` | 🔒 `401` | Admin |
| GET | `/categories` | ✅ `200` | |
| POST | `/categories` | 🔒 `401` | Admin |
| PUT | `/categories/:id` | 🔒 `401` | Admin |
| DELETE | `/categories/:id` | 🔒 `401` | Admin |

---

### 🏥 Insurance — `/api/insurance`

| Method | Route | Status | Notes |
|--------|-------|--------|-------|
| GET | `/insurance/plans` | ✅ `200` | |
| POST | `/insurance/calculate-premium` | ✅ `200` | Returns premium for given age/sum insured |
| POST | `/insurance/applications` | 🔒 `401` | User |
| GET | `/insurance/applications/:id` | 🔒 `401` | User |
| GET | `/insurance/applications` | 🔒 `401` | Admin |
| PUT | `/insurance/applications/:id` | 🔒 `401` | Admin |

---

### 🎫 Support Tickets — `/api/support`

| Method | Route | Status | Notes |
|--------|-------|--------|-------|
| POST | `/support/tickets` | 🔒 `401` | User |
| GET | `/support/tickets/:id` | 🔒 `401` | User |
| POST | `/support/tickets/:id/messages` | 🔒 `401` | User |
| GET | `/support/tickets` | 🔒 `401` | Admin |
| PUT | `/support/tickets/:id` | 🔒 `401` | Admin |
| PUT | `/support/tickets/:id/resolve` | 🔒 `401` | Admin |

---

### 📊 Reports — `/api/reports`

| Method | Route | Status | Notes |
|--------|-------|--------|-------|
| GET | `/reports/dashboard` | 🔒 `401` | Admin |
| GET | `/reports/revenue-by-city` | 🔒 `401` | Admin |
| GET | `/reports/revenue-by-plan` | 🔒 `401` | Admin |
| GET | `/reports/service-usage` | 🔒 `401` | Admin |
| GET | `/reports/caregiver-performance` | 🔒 `401` | Admin |
| GET | `/reports/refund-analysis` | 🔒 `401` | Admin |
| GET | `/reports/customer-retention` | 🔒 `401` | Admin |
| GET | `/reports/csv/bookings` | 🔒 `401` | Admin — CSV download |
| GET | `/reports/csv/users` | 🔒 `401` | Admin |
| GET | `/reports/csv/payments` | 🔒 `401` | Admin |

---

### 🔍 Audit Logs — `/api/audit-logs`

| Method | Route | Status | Notes |
|--------|-------|--------|-------|
| GET | `/audit-logs` | 🔒 `401` | SUPER_ADMIN / CITY_ADMIN |
| GET | `/audit-logs/:id` | 🔒 `401` | |

---

### 🖥 Server-Driven UI — `/api/ui-config`

| Method | Route | Status | Notes |
|--------|-------|--------|-------|
| GET | `/ui-config/published` | ✅ `200` | Public — fetches live app config |
| GET | `/ui-config` | 🔒 `401` | Admin |
| GET | `/ui-config/:id` | 🔒 `401` | Admin |
| POST | `/ui-config` | 🔒 `401` | Admin |
| PUT | `/ui-config/:id` | 🔒 `401` | Admin |
| PUT | `/ui-config/:id/publish` | 🔒 `401` | Admin |
| DELETE | `/ui-config/:id` | 🔒 `401` | Admin |

---

### 🖼 Media Library — `/api/media`

| Method | Route | Status | Notes |
|--------|-------|--------|-------|
| GET | `/media` | 🔒 `401` | Admin |
| POST | `/media/upload` | 🔒 `401` | User or Admin, Multipart |
| DELETE | `/media/:id` | 🔒 `401` | Admin |

---

### 🧪 Labs — `/api/labs`

| Method | Route | Status | Notes |
|--------|-------|--------|-------|
| GET | `/labs/tests` | ❌ `404` | **Not deployed** — code exists locally, push to Render |
| GET | `/labs/packages` | ❌ `404` | **Not deployed** |
| POST | `/labs/book` | ❌ `404` | **Not deployed** |
| GET | `/labs/booking/:id` | ❌ `404` | **Not deployed** |

---

### 🪝 Webhooks — `/api/webhooks`

| Method | Route | Status | Notes |
|--------|-------|--------|-------|
| POST | `/webhooks/razorpay` | ⚠️ `400` | Route works. Returns 400 when `x-razorpay-signature` header is missing (expected — Razorpay sends this header) |

---

### 👤 Admin Management — `/api/admin`

| Method | Route | Status | Notes |
|--------|-------|--------|-------|
| GET | `/admin` | 🔒 `401` | SUPER_ADMIN |
| GET | `/admin/:id` | 🔒 `401` | |
| PUT | `/admin/:id` | 🔒 `401` | |
| PUT | `/admin/:id/password` | 🔒 `401` | |
| DELETE | `/admin/:id` | 🔒 `401` | |

---

## Issues Requiring Action

| # | Severity | Component | Problem | Fix |
|---|----------|-----------|---------|-----|
| 1 | 🔴 High | Backend Route | `POST /auth/request-otp` — Twilio Trial error | Push local Fast2SMS branch to Render |
| 2 | 🔴 High | Backend Route | `GET /labs/*`, `POST /labs/*` — All 4 lab endpoints 404 | Push local branch to Render |
| 3 | 🔴 High | Backend Route | `POST /users` — 500 crash on missing `cityId` | **✅ FIXED** — Added 400 validation guard |
| 4 | 🔴 High | Mobile App | Firebase config vars are empty in `.env` | Fill Firebase Console values into `mobile/.env` |
| 5 | 🔴 High | Mobile App | Duplicate route name 'payment' (root + folder) | **✅ FIXED** — Moved `payment.tsx` → `payment/checkout.tsx` |
| 6 | 🟡 Low | Backend Route | `POST /auth/admin/login` — "Invalid credentials" | Run `npm run prisma:seed` on production DB |
| 7 | 🟡 Low | Backend Route | `GET /legal/published/TERMS` — 500 error | Client should use `TERMS_AND_CONDITIONS` enum |

---

## Background Jobs

| Job | Schedule | Description |
|-----|----------|-------------|
| Plan Expiry Reminder | Daily 9 AM | WhatsApp + Email for 7-day and 3-day expiry |
| Subscription Auto-Renew | Daily 1 AM | Auto-creates new subscription for auto-renew users |
| SLA Breach Checker | Every 30 min | Flags bookings past SLA deadline |
| Expired Cleanup | Daily 2 AM | Marks expired subscriptions |

---

## Database Models (24 Tables)

```
Admin, City, User, Address, EmergencyContact, MedicalCard, HealthReport,
Service, Booking, Caregiver, Plan, Subscription, Payment, Invoice,
SOSAlert, NotificationLog, NotificationTemplate, LegalDocument,
Product, Category, WaitlistEntry, AuditLog, UIConfig,
InsuranceApplication, Coupon, MediaAsset, SupportTicket, TicketMessage
```

---

## Tech Stack

| Component | Technology |
|-----------|-----------|
| Runtime | Node.js |
| Framework | Express.js |
| ORM | Prisma |
| Database | PostgreSQL (Supabase) |
| Auth | JWT + bcrypt |
| Payments | Razorpay |
| File Storage | Cloudflare R2 (AWS S3 SDK) |
| PDF Engine | PDFKit |
| Cron | node-cron |
| Email | ZeptoMail |
| SMS/OTP | Fast2SMS |
| WhatsApp | Fast2SMS |
| Lab Tests | Redcliffe Labs API |
| OCR | Google Cloud Vision |
| Logging | Winston + Morgan |
| Validation | express-validator |
| Security | Helmet + CORS + Rate Limiting |

---

## Compliance

- ✅ GST Invoice format (18% GST)
- ✅ User ID generation: `MED-{CITY}-{SEQ}`
- ✅ Audit logging on all admin mutations
- ✅ Soft-delete patterns for data retention
- ✅ HMAC-SHA256 Razorpay webhook verification
- ✅ OTP rate limiting: 3 requests per 10 minutes per phone number
