# Quick Setup - Backend Deployment

## 1. VPS Setup (One Command)

SSH into your Hostinger VPS:
```bash
ssh root@your_vps_ip
```

Run setup:
```bash
cd /tmp
git clone --depth 1 --branch main https://github.com/oldful-dev/medico.git medico-temp
cd medico-temp/backend
chmod +x setup.sh
sudo ./setup.sh
```

This will:
- Create `/var/www/medico-backend`
- Clone your repo
- Install dependencies
- Setup PM2 with ecosystem.config.js
- Configure Nginx
- Setup SSL with Let's Encrypt
- Setup webhook receiver on port 3001

## 2. Configure Environment

```bash
# Copy example to .env
cp /var/www/medico-backend/.env.example /var/www/medico-backend/.env

# Edit with your secrets
nano /var/www/medico-backend/.env
```

### Critical Environment Variables:
- `DATABASE_URL` - PostgreSQL connection string
- `REDIS_URL` - Redis connection (default: redis://localhost:6379)
- `JWT_SECRET` - Strong random secret (32+ chars)
- `GITHUB_WEBHOOK_SECRET` - Match your GitHub webhook secret
- `FIREBASE_*` - Firebase service account credentials
- `RAZORPAY_KEY_*` - Payment gateway keys
- `ZEPTOMAIL_API_KEY` - Email service key
- `GOOGLE_CLOUD_*` - GCS credentials

Generate strong secrets:
```bash
openssl rand -base64 32
```

## 3. Start Services

```bash
cd /var/www/medico-backend

# Generate Prisma client
npm run prisma:generate

# Run migrations
npm run prisma:migrate

# Start PM2
pm2 start ecosystem.config.js

# Start webhook receiver
pm2 start webhook.js --name medico-webhook

# Save PM2 config
pm2 save
pm2 startup
```

## 4. Setup GitHub Webhook

1. Go to: GitHub Repo → Settings → Webhooks → Add webhook
2. **Payload URL**: `https://api.ayuxacare.com/deploy` (or your domain)
3. **Content type**: `application/json`
4. **Secret**: Same as `GITHUB_WEBHOOK_SECRET` in .env
5. **Events**: Select "Just the push event"
6. Click: Add webhook

## 5. Verify Everything

```bash
# Check API is running
curl https://api.ayuxacare.com/health

# Check PM2 status
pm2 status

# View logs
pm2 logs medico-api
pm2 logs medico-webhook
```

## 6. Test Deployment

Push a change to main:
```bash
git push origin main
```

Watch deployment:
```bash
pm2 logs medico-api -f
```

## Directory Structure on VPS

```
/var/www/medico-backend/
├── src/
├── prisma/
├── node_modules/
├── logs/
├── .env                 # Production secrets (NOT in git)
├── .env.example        # Template
├── ecosystem.config.js # PM2 app config
├── deploy.sh          # Deployment script
├── webhook.js         # Webhook receiver
└── package.json
```

## Useful Commands

```bash
# View API logs
pm2 logs medico-api

# View webhook logs
pm2 logs medico-webhook

# Restart API
pm2 restart medico-api

# Restart webhook
pm2 restart medico-webhook

# Monitor system
pm2 monit

# Manual deployment
cd /var/www/medico-backend && bash deploy.sh

# Check Nginx
systemctl status nginx

# Check SSL
certbot certificates
```

## Troubleshooting

### API not responding
```bash
pm2 logs medico-api --err
curl http://localhost:3000/health
```

### Database connection error
```bash
# Verify DATABASE_URL in .env
cat /var/www/medico-backend/.env | grep DATABASE_URL

# Run migrations
npm run prisma:migrate
```

### Webhook not triggering
```bash
pm2 logs medico-webhook

# Verify secret matches
cat /var/www/medico-backend/.env | grep GITHUB_WEBHOOK_SECRET
```

### Nginx SSL error
```bash
nginx -t
certbot certificates
```

## Security Checklist

- [ ] `.env` file is NOT in git (.gitignore)
- [ ] `GITHUB_WEBHOOK_SECRET` is strong (32+ chars)
- [ ] `JWT_SECRET` is strong and unique
- [ ] Firebase credentials are valid
- [ ] SSL certificate is auto-renewing
- [ ] Firewall rules are configured
- [ ] SSH key-based auth only
- [ ] Regular backups are scheduled

## Environment File Safety

Your `.env` file contains secrets. Make sure:
1. It's in `.gitignore` (already configured)
2. Never commit it to GitHub
3. Keep a backup in secure location
4. Rotate secrets regularly

## Deployment Workflow

```
You: git push origin main
    ↓
GitHub: Sends webhook to https://api.ayuxacare.com/deploy
    ↓
webhook.js: Verifies GitHub signature
    ↓
webhook.js: Checks backend/ files changed
    ↓
webhook.js: Runs deploy.sh
    ↓
deploy.sh: Pulls latest code
deploy.sh: npm install
deploy.sh: npm run prisma:migrate
deploy.sh: pm2 restart medico-api
    ↓
API: Live ✓
```

Monitor with: `pm2 logs medico-api -f`

## Support

- Deployment issues? Check logs: `pm2 logs`
- Database issues? Check migrations: `npm run prisma:migrate`
- Webhook issues? Check secret: `cat .env | grep WEBHOOK`

Need help? Email: vishal@getniv.com
