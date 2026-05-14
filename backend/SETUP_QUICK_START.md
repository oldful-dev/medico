# Quick Setup - Hostinger VPS Terminal Only

## Step 1: SSH into Hostinger VPS Terminal

```bash
# Open Hostinger terminal or SSH from your computer
ssh root@YOUR_VPS_IP
```

**Everything below runs INSIDE your VPS terminal**

## Step 2: Download & Run Setup Script

```bash
# Download setup script from GitHub (inside VPS)
cd /tmp
git clone --depth 1 --branch main https://github.com/oldful-dev/medico.git medico-temp
cd medico-temp/backend

# Run setup script (inside VPS)
sudo bash setup.sh
```

**This automatically:**
- Creates `/var/www/medico-backend`
- Installs Node, npm, Nginx, Redis, Certbot
- Clones your backend code
- Sets up PM2
- Configures Nginx reverse proxy
- Gets SSL certificate from Let's Encrypt
- Starts webhook receiver

## Step 3: Configure Environment (Inside VPS)

```bash
# Inside VPS terminal
cp /var/www/medico-backend/.env.example /var/www/medico-backend/.env

# Edit environment variables
nano /var/www/medico-backend/.env
```

Update these variables:
- `DATABASE_URL` → Your database connection string
- `REDIS_URL` → Your Redis URL
- `JWT_SECRET` → Strong random secret
- `GITHUB_WEBHOOK_SECRET` → Strong random secret (32+ chars)
- `FIREBASE_*` → Your Firebase credentials
- `RAZORPAY_KEY_*` → Your payment keys
- `ZEPTOMAIL_API_KEY` → Your email service key
- `GOOGLE_CLOUD_*` → Your GCS credentials

Generate strong secrets in VPS terminal:
```bash
# Run inside VPS to generate random secret
openssl rand -base64 32
```

## Step 4: Setup Database (Inside VPS)

```bash
# Inside VPS terminal
cd /var/www/medico-backend

# Generate Prisma client
npm run prisma:generate

# Run migrations
npm run prisma:migrate
```

## Step 5: Start Services (Inside VPS)

```bash
# Inside VPS terminal
# Services should already be running from setup.sh
# Verify they're running:

pm2 status
```

You should see:
- `medico-api` (online)
- `medico-webhook` (online)

## Step 6: Configure GitHub Webhook (From Your Computer)

1. Go to your local computer browser
2. Open GitHub: https://github.com/oldful-dev/medico
3. Click: Settings → Webhooks → Add webhook
4. Fill in:
   - **Payload URL**: `https://api.ayuxacare.com/deploy`
   - **Content type**: `application/json`
   - **Secret**: Copy your `GITHUB_WEBHOOK_SECRET` from `.env` in VPS
   - **Events**: Select "Just the push event"
5. Click: Add webhook

## Step 7: Verify Everything (Inside VPS Terminal)

```bash
# Test API is running
curl https://api.ayuxacare.com/health

# Check PM2 services
pm2 status

# View API logs
pm2 logs medico-api

# View webhook logs
pm2 logs medico-webhook
```

## Step 8: Test Deployment (From Your Computer)

```bash
# From your local computer (NOT VPS)
cd ~/path/to/your/medico/repo

# Make a small change and push to main
git push origin main
```

## Monitor Deployment (Inside VPS Terminal)

```bash
# Inside VPS terminal
# Watch the deployment happen in real-time
pm2 logs medico-api -f
```

When you see "✓ Deployment completed successfully", your API is live!

---

## All Commands Summary (VPS Terminal)

### View Logs
```bash
pm2 logs medico-api              # Watch API logs
pm2 logs medico-webhook          # Watch webhook logs
pm2 logs medico-api -f           # Follow API logs (real-time)
```

### Check Status
```bash
pm2 status                       # Check all services
pm2 monit                        # Monitor resources
systemctl status nginx           # Check Nginx
```

### Restart Services
```bash
pm2 restart medico-api           # Restart API
pm2 restart medico-webhook       # Restart webhook
systemctl restart nginx          # Restart Nginx
```

### Manual Deployment
```bash
# Inside VPS terminal
cd /var/www/medico-backend
bash deploy.sh
```

### Check Configuration
```bash
# View your .env variables
cat /var/www/medico-backend/.env

# Check database connection
echo $DATABASE_URL

# Check webhook secret
grep GITHUB_WEBHOOK_SECRET /var/www/medico-backend/.env
```

### System Info
```bash
df -h                            # Disk space
free -h                          # Memory usage
ps aux | grep node               # Node processes
```

### Nginx & SSL
```bash
nginx -t                         # Test Nginx config
systemctl status nginx           # Check Nginx
certbot certificates             # Check SSL cert
certbot renew                    # Renew SSL cert
```

### Troubleshooting
```bash
# API errors
pm2 logs medico-api --err

# Database issues
npm run prisma:migrate

# Webhook issues
pm2 logs medico-webhook --err

# Nginx errors
tail -f /var/log/nginx/error.log
```

---

## Directory Structure (On VPS)

```
/var/www/medico-backend/
├── src/                        Source code
├── prisma/                     Database schema
├── node_modules/               Dependencies
├── logs/                       Application logs
├── .env                        Your production secrets (NOT in git)
├── .env.example                Template (in git)
├── deploy.sh                   Deployment script
├── webhook.js                  Webhook receiver
├── ecosystem.config.js         PM2 configuration
├── package.json
└── src/server.js               Entry point
```

---

## Port Reference (VPS)

```
Port 80   → Nginx (HTTP, redirects to HTTPS)
Port 443  → Nginx (HTTPS, proxies to your API)
Port 3000 → Node.js API (internal, proxied by Nginx)
Port 3001 → Webhook receiver (internal, receives GitHub webhooks)
Port 6379 → Redis (local cache)
Port 5432 → PostgreSQL (external database)
```

---

## Deployment Flow (Automated)

```
You (local computer):
$ git push origin main

GitHub:
→ Sends webhook to https://api.ayuxacare.com/deploy

VPS webhook.js (port 3001):
→ Verifies GitHub signature
→ Checks if backend/ files changed
→ Triggers deploy.sh

VPS deploy.sh:
→ git pull origin main
→ npm install --production
→ npm run prisma:migrate
→ pm2 restart medico-api

Result:
→ Your API updated and restarted ✓
```

Monitor from VPS terminal:
```bash
pm2 logs medico-api -f
```

---

## Important Notes

⚠️ **All setup happens in VPS terminal**
- Connect to Hostinger VPS via SSH or terminal
- Run `setup.sh` in VPS
- Edit `.env` in VPS
- Run migrations in VPS
- Check logs in VPS

✅ **GitHub webhook setup happens from your computer**
- Add webhook URL in GitHub settings (from your browser)
- Push code from your local computer

🔒 **Never commit .env to GitHub**
- `.env` stays on VPS only
- `.gitignore` already blocks it

---

## Quick Help

**Something not working?**

```bash
# Check these in VPS terminal:

# 1. Check if services are running
pm2 status

# 2. Check error logs
pm2 logs medico-api --err
pm2 logs medico-webhook --err

# 3. Check environment is set
cat /var/www/medico-backend/.env

# 4. Check database connection
npm run prisma:migrate

# 5. Check webhook receiver
pm2 logs medico-webhook
```

Need help? Ask in VPS terminal: `pm2 help`
