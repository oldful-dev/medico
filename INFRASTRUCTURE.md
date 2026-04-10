# Oldful — Production Infrastructure

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                        MOBILE APP (Expo/RN)                         │
│                                                                     │
│  ┌──────────────┐  ┌──────────────┐  ┌────────────────────────┐    │
│  │ SDUI Renderer │  │ Image Loader │  │ Upload (Signed URL)    │    │
│  │ fetch JSON    │  │ lazy + cache │  │ PUT → GCS direct       │    │
│  └──────┬───────┘  └──────┬───────┘  └──────────┬─────────────┘    │
└─────────┼──────────────────┼────────────────────┼──────────────────┘
          │                  │                    │
          ▼                  ▼                    ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    CLOUDFLARE EDGE (CDN + WAF)                      │
│                                                                     │
│  ┌─────────────────────┐  ┌──────────────────────────────────┐     │
│  │  api.oldful.com/*   │  │  assets.oldful.com/*             │     │
│  │  (api-cache Worker) │  │  (gcs-proxy Worker)              │     │
│  │                     │  │                                  │     │
│  │  • SDUI cache 5min  │  │  • Proxy → GCS bucket            │     │
│  │  • Geo headers      │  │  • 1yr cache (immutable)         │     │
│  │  • Auth bypass      │  │  • CORS headers                  │     │
│  │  • Rate limit (WAF) │  │  • Cache-Tag per folder          │     │
│  └──────────┬──────────┘  └──────────────┬───────────────────┘     │
│             │                            │                          │
│  ┌──────────┴──────────────────────────────────────────────┐       │
│  │  Cloudflare WAF Rules                                    │       │
│  │  • Rate limit: /api/auth/* → 10 req/min                 │       │
│  │  • Rate limit: /api/payments/* → 30 req/min             │       │
│  │  • Bot protection: challenge score < 30                  │       │
│  │  • Block: SQL injection, XSS patterns                    │       │
│  │  • Country block: optional geo-fence                     │       │
│  └──────────────────────────────────────────────────────────┘       │
└─────────┬──────────────────────────────┬───────────────────────────┘
          │                              │
          ▼                              ▼
┌─────────────────────┐    ┌─────────────────────────────────────────┐
│   NODE.JS BACKEND   │    │     GOOGLE CLOUD STORAGE (GCS)          │
│   (Render.com)      │    │     Bucket: oldful-assets               │
│                     │    │     Region: asia-south1                  │
│  /api/auth/*        │    │                                         │
│  /api/users/*       │    │  ┌─────────────────────────────────┐    │
│  /api/bookings/*    │    │  │ PUBLIC (IAM: allUsers Viewer)   │    │
│  /api/app-config/*  │    │  │                                 │    │
│  /api/media/*       │    │  │  /users/profile-avatars/        │    │
│  /api/upload/*      │    │  │  /assets/banners/               │    │
│  /api/support/*     │    │  │  /assets/icons/                 │    │
│                     │    │  │  /assets/services/              │    │
│  ┌───────────────┐  │    │  │  /bookings/{slug}/              │    │
│  │ Rate Limiters │  │    │  └─────────────────────────────────┘    │
│  │ Global: 200/15m│ │    │                                         │
│  │ Auth:   10/15m │  │    │  ┌─────────────────────────────────┐    │
│  │ Upload: 20/15m │  │    │  │ PRIVATE (Signed URLs only)     │    │
│  │ Payment:30/15m │  │    │  │                                 │    │
│  └───────────────┘  │    │  │  /documents/health-reports/     │    │
│                     │    │  │  /documents/sla/                │    │
│  ┌───────────────┐  │    │  │  /documents/invoices/           │    │
│  │ Storage Svc   │  │    │  │  /users/documents/              │    │
│  │ • Upload      │  │    │  │  /admin/exports/                │    │
│  │ • Signed URLs │  │    │  └─────────────────────────────────┘    │
│  │ • CDN purge   │  │    │                                         │
│  └───────────────┘  │    │  Access: Uniform Bucket-Level Access    │
└─────────────────────┘    │  Encryption: Google-managed (AES-256)   │
          │                └─────────────────────────────────────────┘
          │
          ▼
┌─────────────────────┐
│   CLOUDFLARE R2     │
│   (Fallback only)   │
│                     │
│   S3-compatible     │
│   Zero egress fees  │
└─────────────────────┘
```

---

## GCS Bucket Structure

```
oldful-assets/
├── users/
│   ├── profile-avatars/     ← PUBLIC  (CDN, 1yr cache)
│   └── documents/           ← PRIVATE (signed URLs, 60min)
│
├── documents/
│   ├── health-reports/      ← PRIVATE (signed URLs, OCR processed)
│   ├── sla/                 ← PRIVATE (generated PDFs)
│   └── invoices/            ← PRIVATE (generated PDFs)
│
├── assets/
│   ├── banners/             ← PUBLIC  (CDN, 1yr cache)
│   ├── icons/               ← PUBLIC  (CDN, 30day cache)
│   └── services/            ← PUBLIC  (CDN, 1yr cache)
│
├── admin/
│   └── exports/             ← PRIVATE (signed URLs, admin only)
│
└── bookings/
    ├── nurse-care/          ← PUBLIC  (CDN, 1yr cache)
    ├── blood-test/          ← PUBLIC
    ├── doctor-visit/        ← PUBLIC
    └── {service-slug}/      ← PUBLIC
```

### Bucket IAM Policy
```
allUsers                → Storage Object Viewer  (public read for non-private folders)
service-account@gcp     → Storage Object Admin   (full CRUD for backend)
```

### Bucket Settings
- **Uniform Bucket-Level Access**: Enabled (no per-object ACLs)
- **Lifecycle**: Delete objects in `/admin/exports/` after 30 days
- **Versioning**: Disabled (UUID filenames = immutable)
- **Location**: asia-south1 (Mumbai — closest to Indian users)

---

## Cloudflare Configuration

### DNS Records
| Type  | Name   | Content                           | Proxy |
|-------|--------|-----------------------------------|-------|
| A     | assets | 192.0.2.1                         | Yes   |
| CNAME | api    | medico-crzu.onrender.com          | Yes   |
| CNAME | @      | your-frontend.vercel.app          | Yes   |

### Workers
| Worker      | Route               | Purpose                     |
|-------------|---------------------|-----------------------------|
| gcs-proxy   | assets.oldful.com/* | Proxy GCS with CDN caching  |
| api-cache   | api.oldful.com/*    | Cache SDUI + geo headers    |

### Cache Rules (Cloudflare Dashboard → Caching → Cache Rules)

**Rule 1: Static Assets (1 year)**
```
When: Hostname = assets.oldful.com AND URI path matches .*\.(jpg|jpeg|png|webp|gif|pdf|mp4)$
Then: Cache eligible, Edge TTL = 365 days, Browser TTL = 365 days
```

**Rule 2: SVG/Icons (30 days)**
```
When: Hostname = assets.oldful.com AND URI path matches .*\.svg$
Then: Cache eligible, Edge TTL = 30 days, Browser TTL = 30 days
```

**Rule 3: API No-Cache Default**
```
When: Hostname = api.oldful.com AND URI path starts with /api/
Then: Bypass cache (Worker handles selective caching)
```

### WAF Rules (Cloudflare Dashboard → Security → WAF)

**Rule 1: Auth Rate Limit**
```
When: URI path matches /api/auth/.*
Then: Rate limit 10 requests per minute per IP
Action: Block for 60 seconds
```

**Rule 2: OTP Abuse Prevention**
```
When: URI path = /api/auth/request-otp AND Method = POST
Then: Rate limit 3 requests per 10 minutes per IP
Action: Block for 600 seconds
```

**Rule 3: Payment Protection**
```
When: URI path matches /api/payments/.* AND Method = POST
Then: Rate limit 5 requests per minute per IP
Action: Challenge (CAPTCHA)
```

**Rule 4: Bot Protection**
```
When: Bot Score < 30 AND URI path starts with /api/
Then: Managed Challenge
Skip: Known bots (Google, monitoring)
```

**Rule 5: SQL Injection / XSS Block**
```
Enable: Cloudflare Managed Ruleset (OWASP Core)
Sensitivity: High
Action: Block
```

### Transform Rules (Dashboard → Rules → Transform Rules)

**Alternative to gcs-proxy Worker (simpler, no code):**
```
Rule: GCS Proxy
When:  Hostname = assets.oldful.com
Rewrite URL (dynamic):
  Path:   concat("/oldful-assets", http.request.uri.path)
  Host:   storage.googleapis.com
```

---

## API Structure

### Upload Flow (Signed URL — Preferred)

```
Mobile App                    Backend                         GCS
    │                            │                              │
    ├─ POST /media/signed-url ──►│                              │
    │  {folder, fileName,        │                              │
    │   contentType}             │── getSignedUploadUrl() ─────►│
    │                            │◄─ {signedUrl, storagePath} ──│
    │◄─ {signedUrl, fileUrl} ────│                              │
    │                            │                              │
    ├─ PUT signedUrl ────────────┼─────────────────────────────►│
    │  (raw file bytes)          │                    File saved│
    │◄─ 200 OK ─────────────────┼──────────────────────────────│
    │                            │                              │
    ├─ POST /media/confirm ─────►│                              │
    │  {storagePath, fileUrl}    │── DB insert (MediaAsset) ───►│
    │                            │── purgeCDNCache() ──────────►│ Cloudflare
    │◄─ {asset} ────────────────│                              │
    │                            │                              │
    ├─ GET fileUrl (via CDN) ───►│         Cloudflare Edge      │
    │  assets.oldful.com/...     │◄────── cached response ─────│
    │◄─ image bytes ─────────────│                              │
```

### Upload Flow (Proxy Fallback)
```
Mobile App                    Backend                         GCS
    │                            │                              │
    ├─ POST /media/upload ──────►│                              │
    │  (FormData + file)         │── uploadFile(buffer) ───────►│
    │                            │── DB insert ────────────────►│
    │◄─ {asset with CDN url} ───│                              │
```

### Private File Access
```
Mobile App                    Backend                         GCS
    │                            │                              │
    ├─ GET /users/profile ──────►│                              │
    │                            │── getSignedDownloadUrl() ───►│
    │◄─ {healthReports: [{      │◄─ signedUrl (60min) ────────│
    │     fileUrl: signedUrl}]} ─│                              │
    │                            │                              │
    ├─ GET signedUrl ────────────┼─────────────────────────────►│
    │◄─ PDF bytes ───────────────┼──────────────────────────────│
```

### SDUI Config Flow
```
Mobile App                  Cloudflare Edge                 Backend
    │                            │                              │
    ├─ GET /api/app-config ─────►│                              │
    │                            │── Cache HIT? ───────────────►│
    │                            │   (5 min TTL)                │
    │                            │                              │
    │   [If MISS]                │── Forward to origin ────────►│
    │                            │◄─ SDUI JSON ────────────────│
    │                            │── Store in edge cache        │
    │◄─ SDUI JSON (+ geo hdrs) ─│                              │
    │                            │                              │
    │   [If HIT]                 │                              │
    │◄─ SDUI JSON (cached) ─────│                              │
```

---

## Endpoint Summary

| Method | Path                       | Auth  | Rate Limit | Cache  |
|--------|----------------------------|-------|------------|--------|
| POST   | /api/auth/request-otp      | No    | 3/10min    | No     |
| POST   | /api/auth/verify-otp       | No    | 10/15min   | No     |
| POST   | /api/auth/admin/login      | No    | 10/15min   | No     |
| GET    | /api/app-config            | No    | Global     | 5min   |
| GET    | /api/cities                | No    | Global     | 10min  |
| GET    | /api/services              | No    | Global     | 10min  |
| GET    | /api/plans                 | No    | Global     | 10min  |
| POST   | /api/media/signed-url      | User  | 20/15min   | No     |
| POST   | /api/media/confirm         | User  | 20/15min   | No     |
| POST   | /api/media/upload          | User  | 20/15min   | No     |
| POST   | /api/upload                | User  | 20/15min   | No     |
| POST   | /api/bookings              | User  | Global     | No     |
| POST   | /api/payments/*            | User  | 30/15min   | No     |
| GET    | /api/users/profile         | User  | Global     | No     |
| PUT    | /api/users/profile/avatar  | User  | 20/15min   | No     |
| GET    | /api/health                | No    | Skip       | 1min   |
| GET    | /api/health?deep=true      | No    | Global     | No     |

---

## Failure Handling

### CDN Failure → GCS Direct
```javascript
// storage.service.js — toCDNUrl() already has fallback:
const toCDNUrl = (storagePath, folder) => {
    if (isPrivateFolder(folder)) return null; // Signed URL
    const cdn = process.env.ASSETS_CDN_URL;
    if (cdn) return `${cdn}/${storagePath}`;
    return `https://storage.googleapis.com/${bucket}/${storagePath}`; // Fallback
};
```

### Upload Retry (Mobile)
```typescript
// mediaService.ts — already implements:
// 1. Try signed URL upload → GCS direct
// 2. If fails → fallback to proxy upload through backend
// 3. 60s timeout with AbortController
```

### GCS Failure → R2 Fallback
```javascript
// storage.service.js — uploadFile() tries:
// 1. GCS (primary)
// 2. R2 (fallback) — if GCS unavailable
```

---

## Environment Variables

```env
# ─── GCS ───────────────────────────────────────
GOOGLE_STORAGE_BUCKET_NAME=oldful-assets
FIREBASE_SERVICE_ACCOUNT_PATH=./firebase-service-account.json

# ─── Cloudflare CDN ────────────────────────────
# Option A: Use Transform Rule (no Worker needed)
ASSETS_CDN_URL=https://assets.oldful.com

# Option B: Use GCS direct (works immediately, no Cloudflare setup)
# ASSETS_CDN_URL=https://storage.googleapis.com/oldful-assets

CLOUDFLARE_API_KEY=your-api-token
CLOUDFLARE_ZONE_ID=your-zone-id

# ─── Cloudflare R2 (fallback) ──────────────────
R2_ACCOUNT_ID=your-account-id
R2_ACCESS_KEY_ID=your-key
R2_SECRET_ACCESS_KEY=your-secret
R2_BUCKET_NAME=oldful-r2
```

---

## Quick Start Checklist

### GCS Setup
- [ ] Create bucket `oldful-assets` in `asia-south1`
- [ ] Enable **Uniform Bucket-Level Access**
- [ ] Grant `allUsers` → **Storage Object Viewer** (public read)
- [ ] Grant service account → **Storage Object Admin**
- [ ] Set lifecycle: delete `/admin/exports/*` after 30 days

### Cloudflare Setup (Choose ONE)

**Option A: Transform Rule (simplest, no code)**
- [ ] DNS: `assets.oldful.com` → A `192.0.2.1` (proxied)
- [ ] Transform Rule: rewrite path to `/oldful-assets/{path}`, host to `storage.googleapis.com`
- [ ] Set `ASSETS_CDN_URL=https://assets.oldful.com` in `.env`

**Option B: Worker**
- [ ] Deploy `cloudflare-worker/gcs-proxy.js` as Worker
- [ ] Add route: `assets.oldful.com/*`
- [ ] DNS: `assets.oldful.com` → A `192.0.2.1` (proxied)
- [ ] Set `ASSETS_CDN_URL=https://assets.oldful.com` in `.env`

**Option C: No CDN (works immediately)**
- [ ] Set `ASSETS_CDN_URL=https://storage.googleapis.com/oldful-assets` in `.env`
- [ ] Grant `allUsers` → Storage Object Viewer on bucket

### WAF Setup
- [ ] Enable Cloudflare Managed Ruleset (OWASP)
- [ ] Add rate limit rule for `/api/auth/*`
- [ ] Add rate limit rule for `/api/payments/*`
- [ ] Enable Bot Fight Mode

### Backend
- [ ] `trust proxy` is set (done in server.js)
- [ ] Rate limiters configured (done — global, auth, payment, upload)
- [ ] Storage health check: `GET /api/health?deep=true`

### Mobile
- [ ] Signed URL upload with proxy fallback (done)
- [ ] 60s upload timeout (done)
- [ ] Image lazy loading via `<Image>` component (native)
- [ ] SDUI JSON cached in AppConfigContext (done)
