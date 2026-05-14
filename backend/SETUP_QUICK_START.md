# Quick Setup - Commands Only

## VPS Setup

```bash
ssh root@your_vps_ip

cd /tmp && git clone --depth 1 --branch main https://github.com/oldful-dev/medico.git medico-temp
cd medico-temp/backend
sudo bash setup.sh
```

## Configure Environment

```bash
cp /var/www/medico-backend/.env.example /var/www/medico-backend/.env
nano /var/www/medico-backend/.env
```

Update these:
- `DATABASE_URL`
- `REDIS_URL`
- `JWT_SECRET`
- `GITHUB_WEBHOOK_SECRET` (32+ chars, strong random)
- `FIREBASE_*` (your Firebase credentials)
- `RAZORPAY_KEY_*`
- `ZEPTOMAIL_API_KEY`
- `GOOGLE_CLOUD_*`

Generate strong secrets:
```bash
openssl rand -base64 32
```

## Database Setup

```bash
cd /var/www/medico-backend
npm run prisma:generate
npm run prisma:migrate
```

## Start Services

```bash
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

## GitHub Webhook

1. Go to: GitHub Repo → Settings → Webhooks → Add webhook
2. **Payload URL**: `https://api.ayuxacare.com/deploy`
3. **Content type**: `application/json`
4. **Secret**: Your `GITHUB_WEBHOOK_SECRET` from .env
5. **Events**: Select "Just the push event"
6. Click: Add webhook

## Verify

```bash
# Check API
curl https://api.ayuxacare.com/health

# Check services
pm2 status

# View logs
pm2 logs medico-api
pm2 logs medico-webhook

# Monitor
pm2 monit
```

## Test Deployment

```bash
# Push code to main
git push origin main

# Watch deployment
pm2 logs medico-api -f
```

## Useful Commands

```bash
# View logs
pm2 logs medico-api              # App logs
pm2 logs medico-webhook          # Webhook logs

# Restart services
pm2 restart medico-api           # Restart API
pm2 restart medico-webhook       # Restart webhook
systemctl restart nginx          # Restart Nginx

# Manual deployment
cd /var/www/medico-backend && bash deploy.sh

# Check status
pm2 status
pm2 monit
systemctl status nginx
certbot certificates

# System info
df -h                            # Disk space
free -h                          # Memory
```

## Troubleshooting

```bash
# API not responding
pm2 logs medico-api --err
curl http://localhost:3000/health

# Database error
cat /var/www/medico-backend/.env | grep DATABASE_URL
npm run prisma:migrate

# Webhook not triggering
pm2 logs medico-webhook
cat /var/www/medico-backend/.env | grep GITHUB_WEBHOOK_SECRET

# Nginx error
nginx -t
systemctl status nginx
tail -f /var/log/nginx/error.log

# SSL certificate
certbot certificates
certbot renew
```

## Directory Structure

```
/var/www/medico-backend/
├── src/
├── prisma/
├── node_modules/
├── logs/
├── .env                    (production secrets)
├── .env.example           (template in git)
├── deploy.sh              (deployment script)
├── webhook.js             (webhook receiver)
├── ecosystem.config.js    (PM2 config)
├── package.json
└── src/server.js
```

## Ports

```
80    → Nginx (redirects to 443)
443   → Nginx HTTPS (proxies to 3000)
3000  → Node.js API
3001  → Webhook receiver
6379  → Redis
5432  → PostgreSQL
```

## Deployment Workflow

```
git push origin main
    ↓
GitHub webhook
    ↓
webhook.js (port 3001)
    ↓
deploy.sh runs:
  - git pull
  - npm install
  - npm run prisma:migrate
  - pm2 restart medico-api
    ↓
API live ✓
```

Monitor: `pm2 logs medico-api -f`
