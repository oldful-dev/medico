# Hostinger Deployment Configuration Guide

## Issue: Socket.IO Connection Refused
The admin panel shows `ERR_CONNECTION_REFUSED` when connecting to Socket.IO because:
1. Backend `.env` has `ADMIN_FRONTEND_URL=http://localhost:3000` (local dev only)
2. Admin client uses `https://api.oldful.com` but Socket.IO requires WebSocket protocol (`wss://`)
3. CORS check on backend fails because origin doesn't match allowed list

## Step 1: Update Backend Environment Variables on Hostinger

Set these in your **Hostinger Node.js App Environment Variables** section:

### Critical for Socket.IO to work:
```
ADMIN_FRONTEND_URL=https://admin.oldful.com
WEB_FRONTEND_URL=https://oldful.com
APP_FRONTEND_URL=https://api.oldful.com
```

### All other variables (copy from .env.prod):
- `DATABASE_URL` (Supabase connection string with pooler)
- `DIRECT_URL` (Supabase direct connection)
- `JWT_SECRET` (your secret key)
- `JWT_ACCESS_EXPIRY` (15m)
- `JWT_REFRESH_EXPIRY` (7d)
- `FIREBASE_SERVICE_ACCOUNT_PATH` (path on Hostinger server)
- `FAST2SMS_API_KEY`, `FAST2SMS_OTP_TEMPLATE_ID`, etc. (all communication keys)
- `INTERAKT_API_KEY` (WhatsApp)
- `ZEPTOMAIL_API_KEY` (Email)
- `GOOGLE_STORAGE_BUCKET_NAME`, `GOOGLE_MAPS_API_KEY`, `GOOGLE_APPLICATION_CREDENTIALS`
- `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `RAZORPAY_WEBHOOK_SECRET`
- `CLOUDFLARE_API_KEY`, `CLOUDFLARE_ZONE_ID`, `ASSETS_CDN_URL`
- `REDCLIFFE_API_BASE_URL`, `REDCLIFFE_API_KEY`
- `GST_RATE=18`, `COMPANY_GSTIN`, `COMPANY_NAME`, `COMPANY_ADDRESS`

## Step 2: Update Admin Frontend Socket URL

Edit `admin/src/lib/socket.js`:

**Current (broken):**
```javascript
const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL || "https://api.oldful.com";
```

**Required fix:**
```javascript
const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL || "wss://api.oldful.com";
```

Update the fallback from `https://` to `wss://` (WebSocket Secure).

## Step 3: Configure Hostinger Node.js Proxy

Hostinger may require explicit WebSocket support. Check your Hostinger hosting panel:

1. Go to **Web Hosting** → **Your Domain** → **Node.js Settings**
2. Verify **WebSocket support is enabled** (should be default for Node.js)
3. Ensure the **application entry point** is set to `backend/src/server.js`
4. Verify the **port** is set to `5000` or your configured PORT

## Step 4: Deploy Backend to Hostinger

```bash
# Commit your changes
git add backend/
git commit -m "fix: update Socket.IO configuration for Hostinger deployment"

# Push to Hostinger (if using git deployment)
git push hostinger main

# OR upload files via FTP/File Manager to Hostinger
```

## Step 5: Verify Backend is Running

Test the health endpoint:
```bash
curl https://api.oldful.com/api/health
```

Should return:
```json
{
  "success": true,
  "message": "API is running",
  "timestamp": "2026-04-26T..."
}
```

## Step 6: Deploy Admin Frontend

The admin panel should be deployed separately (Next.js static export or Vercel/Netlify).

If deploying to Hostinger's web hosting, ensure **public** directory contains the built Next.js app.

Set environment variable on admin hosting:
```
NEXT_PUBLIC_API_URL=https://api.oldful.com/api
NEXT_PUBLIC_SOCKET_URL=wss://api.oldful.com
```

## Step 7: Test Socket.IO Connection

1. Open admin panel at `https://admin.oldful.com`
2. Open browser DevTools → Network tab
3. Look for WebSocket connection to `wss://api.oldful.com/socket.io`
4. Should see `Connected to Real-time Gateway` in console

## Troubleshooting

### Still getting ERR_CONNECTION_REFUSED?

**Check 1:** Verify backend is running
```bash
curl https://api.oldful.com/api/health
```

**Check 2:** Check backend logs on Hostinger
- Look for "Socket.io initialized" or socket error messages
- Verify no PORT conflict (5000 should be available)

**Check 3:** Check CORS settings
- Backend logs should show accepted/rejected origins
- If origin rejected, update `ADMIN_FRONTEND_URL` env var

**Check 4:** Verify DNS
```bash
nslookup api.oldful.com
```

Should resolve to Hostinger's IP.

**Check 5:** Verify SSL/TLS
- Socket.IO requires `wss://` (encrypted WebSocket)
- Hostinger must have valid SSL certificate for api.oldful.com
- Check browser console for certificate errors

### Socket.IO still times out?

Hostinger may block long-lived connections. Options:
1. Contact Hostinger support to enable WebSocket tunneling
2. Add fallback transports in `admin/src/lib/socket.js`:
   ```javascript
   socket = io(SOCKET_URL, {
       withCredentials: true,
       autoConnect: true,
       transports: ['websocket', 'polling'], // Add fallback to HTTP polling
   });
   ```

## Files Modified for Deployment

- `backend/.env` → Add to Hostinger environment variables
- `admin/src/lib/socket.js` → Update SOCKET_URL fallback to `wss://`
- No changes needed to API URL fallbacks (already set to `https://api.oldful.com`)

## Summary

| Component | Current | Required for Hostinger |
|-----------|---------|------------------------|
| Backend API URL | https://api.oldful.com/api | ✅ Already set |
| Socket.IO URL | https://api.oldful.com | ❌ Must be `wss://api.oldful.com` |
| ADMIN_FRONTEND_URL | http://localhost:3000 | ❌ Must be actual admin domain |
| WebSocket support | Not configured | ✅ Hostinger supports by default |
