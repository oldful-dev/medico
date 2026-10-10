# Ayuxa

Ayuxa is a home-healthcare services platform for the Indian market: customers book care services and diagnostics, pay online or on delivery, hold subscription plans, and manage health records; an admin panel runs operations. This repository is a monorepo of the backend API, a public website, the admin panel and the mobile app.

This README describes what the code contains. It makes no claims about users, revenue or uptime; none were measured. See [Customer and business impact](docs/business/CUSTOMER_AND_BUSINESS_IMPACT.md).

## What is in the code

| Area | What exists (read from the code) |
|---|---|
| Services | Mobile screens and APIs for doctor visits, nurse care, caregiver support, physiotherapy, meal service, medical equipment, medicine ordering, transport and hospital trips, insurance, ECG scans, meetups, and a wellness/product store |
| Diagnostics | Blood tests and packages fulfilled by a partner lab (Redcliffe Labs): hold, pay, confirm, webhook-driven status, in-app report |
| Payments | Razorpay online payments, cash on delivery, coupons, referral rewards, invoices (PDF), refunds |
| Subscriptions | Plans with billing cycles, renewal, pause, upgrade and downgrade, benefits that reset on a schedule |
| Health records | Report upload with Google Cloud Vision text extraction and rule-based flags (no machine-learning model of its own) |
| Operations | Admin panel with seven admin roles, city scoping, session monitoring, audit log, server-driven UI configuration with version history and rollback |
| Notifications | SMS, WhatsApp, email, push (FCM) and real-time Socket.IO events |

Whether each feature is live, and how heavily it is used, is not established by this repository.

## Architecture in one paragraph

A single Express/Prisma/PostgreSQL API (a modular monolith) runs under pm2 on one VPS, with BullMQ on Redis for the partner-lab queues and node-cron jobs inside the same process. The website and admin panel are static Next.js exports on Cloudflare Pages that call the API from the browser. The mobile app is Expo / React Native. Cloudflare fronts all public hostnames. Details and diagrams: [System architecture](docs/architecture/SYSTEM_ARCHITECTURE.md).

## Documentation

- [Architecture](docs/architecture/README.md): inventory, system diagrams, and flows for authentication, payments and subscriptions, lab diagnostics, notifications, document processing, bookings.
- [Engineering](docs/engineering/README.md): fixed-bug forensics with attribution labels, financial-integrity invariants.
- [DevOps](docs/devops/README.md): deployment, CDN and DNS observations.
- [Performance](docs/performance/README.md): exploratory timing measurements and how to reproduce them.
- [Business](docs/business/CUSTOMER_AND_BUSINESS_IMPACT.md): what can and cannot be measured.

## Running it

These commands come from the package files and have **not been run on a clean machine for this README**.

```bash
# backend (needs PostgreSQL and the environment variables listed in the root `.env.example`)
cd backend && npm ci && npx prisma generate && npm run dev

# website and admin
cd web && npm ci && npm run dev
cd admin && npm ci && npm run dev

# mobile
cd mobile && npm ci && npx expo start
```

Known setup limits: the migrations in `backend/prisma/migrations/` have no baseline, so an empty database cannot be created from them alone. `npm run build` in `backend/` runs `prisma db push`, which changes a database schema: do not run it against a database you care about. Never point a local backend at a production database.

## Tests and checks

There is **no automated test suite and no CI pipeline** in this repository. Read-only helper scripts live in `scripts/`:

```bash
scripts/docs/check-links.sh          # verifies relative links in the documentation
scripts/devops/check-domains.sh      # DNS, redirects, TLS and headers for the public hostnames
scripts/performance/measure-edge.sh  # exploratory timings of public endpoints
```

## Known limitations

No automated tests; no CI; a single-server deployment; monetary amounts stored as floating-point; input validation schemas on only part of the API; web and admin are static exports, so there are no server-side routes on the website. Security-relevant findings are tracked privately and not published here.

## Attribution

Some commits carry a `Co-Authored-By` trailer for an AI coding assistant, which means the change was written with AI assistance. Case studies in [Bug-fix forensics](docs/engineering/BUG_FIX_FORENSICS.md) label each one accordingly. Third-party services used: Razorpay, Redcliffe Labs, Google Cloud (Storage, Vision), Firebase, Fast2SMS, ZeptoMail, Delhivery, Cloudflare.
