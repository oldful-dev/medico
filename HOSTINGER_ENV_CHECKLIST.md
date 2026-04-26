# Hostinger Environment Variables Checklist

## What to Set in Hostinger Control Panel

When you upload your Node.js app to Hostinger, you must set these environment variables in the **Hostinger Control Panel → Node.js Settings → Environment Variables** section:

### 🔴 CRITICAL - Must be set for Socket.IO to work:

```
ADMIN_FRONTEND_URL=https://admin.oldful.com
WEB_FRONTEND_URL=https://oldful.com
```

Without these, the Socket.IO CORS check will reject connections from your admin panel.

### Database (Supabase)
Copy these from your local `.env`:
```
DATABASE_URL=postgresql://postgres.okwsgynyqarmfrvubhez:UiAWcrKcOgcdGbe9@aws-1-ap-south-1.pooler.supabase.com:6543/postgres?pgbouncer=true&connect_timeout=30
DIRECT_URL=postgresql://postgres.okwsgynyqarmfrvubhez:UiAWcrKcOgcdGbe9@aws-1-ap-south-1.pooler.supabase.com:5432/postgres
```

### Authentication (JWT)
```
JWT_SECRET=your-super-secret-jwt-key-change-this
JWT_ACCESS_EXPIRY=15m
JWT_REFRESH_EXPIRY=7d
```

### Firebase
```
FIREBASE_SERVICE_ACCOUNT_PATH=/etc/secrets/firebase_account_config.json
```
(You'll need to upload the JSON file separately to Hostinger)

### Fast2SMS (SMS/OTP)
```
FAST2SMS_API_KEY=LIDHkiz9CcUnh2xpqA7rlXfNTe41WRyYBgmJa3wto8bMKvE6uZL0CEDFy85ln4YciT6e7BMtXvpmhRx2
FAST2SMS_OTP_TEMPLATE_ID=212858
FAST2SMS_ORDER_TEMPLATE_ID=211671
FAST2SMS_SOS_ADMIN_TEMPLATE_ID=211670
FAST2SMS_SOS_FAMILY_TEMPLATE_ID=211669
FAST2SMS_SENDER_ID=OLDFUL
FAST2SMS_ENTITY_ID=1201177311714944564
```

### Interakt (WhatsApp)
```
INTERAKT_API_KEY=TVZCYzhOSGk5b2FHcUhZRmFDVUhPV1R3TUs5cmNQd1Q3VHBOVWxJdzRMZzo=
```

### Zeptomail (Email)
```
ZEPTOMAIL_API_KEY=Zoho-enczapikey PHtE6r0NR+DjjzEqpBIGsKWwEMPwZ454+7lufQBDuN5DCvBWSk1R/tl/kTe+q0otBPYRQv+andpoteyZtb/QJ2vsNW1JW2qyqK3sx/VYSPOZsbq6x00Ys1gSck3UVIXpcdFp3SzWvdbaNA==
ZEPTOMAIL_SENDER_EMAIL=noreply@oldful.net
ZEPTOMAIL_SENDER_NAME=Oldful Healthcare
```

### Google Cloud (Storage, Maps, Vision OCR)
```
GOOGLE_STORAGE_BUCKET_NAME=oldful-assets
GOOGLE_MAPS_API_KEY=AIzaSyAy_aH1hCVUnMZVSK_l_Y3Mvngr0BAB0is
GOOGLE_APPLICATION_CREDENTIALS=/etc/secrets/google-vision-key.json
GOOGLE_CLOUD_PROJECT_ID=oldful-backend
```

### Razorpay (Payments)
```
RAZORPAY_KEY_ID=rzp_test_SaYwjCuMwSGGz0
RAZORPAY_KEY_SECRET=zIXCcHsc4K9yRJ97NQ4BZIiG
RAZORPAY_WEBHOOK_SECRET=UX_@4mgtUPWVU2f
```

### Cloudflare (CDN)
```
CLOUDFLARE_API_KEY=3898d6f163d66c0184dbc940ea2e48a4a6dd4
CLOUDFLARE_ZONE_ID=5b27801d72ebd4bcc9df20a4b8bb992c
ASSETS_CDN_URL=https://assets.oldful.com
```

### Redcliffe Labs (Lab Tests)
```
REDCLIFFE_API_BASE_URL=https://api.redcliffelabs.com
REDCLIFFE_API_KEY=8a87c2bf5203917de8c883079bfa252c
```

### Business
```
GST_RATE=18
COMPANY_GSTIN=29AABCU9603R1ZT
COMPANY_NAME=Oldful Healthcare Pvt Ltd
COMPANY_ADDRESS=Bangalore, Karnataka, India
```

### Server
```
PORT=5000
NODE_ENV=production
```

## Secret Files to Upload

These need to be uploaded separately to `/etc/secrets/` or a secure path on Hostinger:

1. **firebase_account_config.json** (Firebase service account key)
   - Path: `/etc/secrets/firebase_account_config.json`
   
2. **google-vision-key.json** (Google Cloud Vision OCR key)
   - Path: `/etc/secrets/google-vision-key.json`

Ask Hostinger support how to upload these securely if you're unsure.

## After Deployment

Once you've set all variables on Hostinger:

1. Restart the Node.js application
2. Test the health endpoint:
   ```
   curl https://api.oldful.com/api/health
   ```
3. Open admin panel and check DevTools → Network for WebSocket connection to `wss://api.oldful.com/socket.io`
4. If still getting ERR_CONNECTION_REFUSED, check Hostinger logs for any startup errors

## Files Already Updated Locally

✅ `admin/src/lib/socket.js` - Changed to `wss://api.oldful.com`
✅ `backend/.env.prod` - Set correct frontend URLs
✅ `backend/.env` - Set correct frontend URLs

Just need to commit and deploy!
