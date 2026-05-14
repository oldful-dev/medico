#!/bin/bash

# VPS Setup Script for Medico Backend
# Run this on your Hostinger VPS as root

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${YELLOW}╔════════════════════════════════════════╗${NC}"
echo -e "${YELLOW}║   Medico API - VPS Setup Script        ║${NC}"
echo -e "${YELLOW}╚════════════════════════════════════════╝${NC}"

# Check if running as root
if [ "$EUID" -ne 0 ]; then
   echo -e "${RED}This script must be run as root${NC}"
   exit 1
fi

# Variables
DOMAIN="${1:-api.ayuxacare.com}"
DEPLOY_DIR="/var/www/medico-backend"
WEBHOOK_DIR="/opt/webhook-receiver"
REPO_URL="${2:-https://github.com/your-username/medico.git}"

echo -e "\n${YELLOW}Configuration:${NC}"
echo "Domain: $DOMAIN"
echo "Deploy Directory: $DEPLOY_DIR"
echo "Repository: $REPO_URL"

read -p "Continue? (y/n) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
  exit 1
fi

# Step 1: Update system
echo -e "\n${YELLOW}[1/10] Updating system...${NC}"
apt update && apt upgrade -y > /dev/null 2>&1
echo -e "${GREEN}✓ System updated${NC}"

# Step 2: Install required packages
echo -e "\n${YELLOW}[2/10] Installing required packages...${NC}"
apt install -y \
  curl wget git \
  nodejs npm \
  nginx \
  redis-server \
  certbot python3-certbot-nginx \
  build-essential python3 > /dev/null 2>&1

echo -e "${GREEN}✓ Packages installed${NC}"

# Verify Node version
NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
  echo -e "${RED}Node.js version must be >= 18. Current: $(node -v)${NC}"
  exit 1
fi
echo -e "${GREEN}✓ Node.js version: $(node -v)${NC}"

# Step 3: Create directories
echo -e "\n${YELLOW}[3/10] Creating directories...${NC}"
mkdir -p $DEPLOY_DIR
mkdir -p $WEBHOOK_DIR
mkdir -p /var/log/medico-deployments
mkdir -p /opt/scripts
echo -e "${GREEN}✓ Directories created${NC}"

# Step 4: Clone repository
echo -e "\n${YELLOW}[4/10] Cloning repository...${NC}"
if [ -d "$DEPLOY_DIR/.git" ]; then
  echo "Repository already cloned. Updating..."
  cd $DEPLOY_DIR
  git fetch origin
  git reset --hard origin/main
  git clean -fd
else
  git clone --depth 1 --branch main $REPO_URL /tmp/medico-temp
  cd /tmp/medico-temp

  # Extract only backend folder
  rm -rf admin client mobile .git .github .gitignore
  mv backend/* $DEPLOY_DIR/
  cd $DEPLOY_DIR
  git init
  git remote add origin $REPO_URL
  git fetch origin main
  git reset --hard origin/main

  rm -rf /tmp/medico-temp
  cd $DEPLOY_DIR
fi

echo -e "${GREEN}✓ Repository cloned${NC}"

# Step 5: Install Node dependencies
echo -e "\n${YELLOW}[5/10] Installing Node dependencies...${NC}"
cd $DEPLOY_DIR
npm install --production > /dev/null 2>&1
echo -e "${GREEN}✓ Dependencies installed${NC}"

# Step 6: Setup environment
echo -e "\n${YELLOW}[6/10] Setting up environment...${NC}"
if [ ! -f "$DEPLOY_DIR/.env" ]; then
  if [ -f "$DEPLOY_DIR/.env.prod" ]; then
    cp $DEPLOY_DIR/.env.prod $DEPLOY_DIR/.env
    echo -e "${YELLOW}Please edit .env file with production values:${NC}"
    echo "nano $DEPLOY_DIR/.env"
    read -p "Press Enter after updating .env file..."
  else
    echo -e "${RED}.env.prod not found. Create .env manually.${NC}"
    exit 1
  fi
fi
echo -e "${GREEN}✓ Environment configured${NC}"

# Step 7: Setup PM2
echo -e "\n${YELLOW}[7/10] Setting up PM2...${NC}"
npm install -g pm2 > /dev/null 2>&1

# Copy ecosystem config
if [ -f "$DEPLOY_DIR/ecosystem.config.js" ]; then
  cd $DEPLOY_DIR
  pm2 start ecosystem.config.js
  pm2 save
  pm2 startup -u root --hp /root
  echo -e "${GREEN}✓ PM2 configured and started${NC}"
else
  echo -e "${RED}ecosystem.config.js not found${NC}"
  exit 1
fi

# Step 8: Setup Nginx
echo -e "\n${YELLOW}[8/10] Setting up Nginx...${NC}"

# Create Nginx config
cat > /etc/nginx/sites-available/$DOMAIN << EOF
upstream medico_api {
    server localhost:3000;
}

server {
    listen 80;
    server_name $DOMAIN;
    return 301 https://\$server_name\$request_uri;
}

server {
    listen 443 ssl http2;
    server_name $DOMAIN;

    ssl_certificate /etc/letsencrypt/live/$DOMAIN/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/$DOMAIN/privkey.pem;

    # Security headers
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-XSS-Protection "1; mode=block" always;

    location / {
        proxy_pass http://medico_api;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;

        # Timeouts
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }
}
EOF

# Enable site
ln -sf /etc/nginx/sites-available/$DOMAIN /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default

# Test and reload Nginx
if nginx -t > /dev/null 2>&1; then
  systemctl restart nginx
  echo -e "${GREEN}✓ Nginx configured${NC}"
else
  echo -e "${RED}Nginx configuration error${NC}"
  nginx -t
  exit 1
fi

# Step 9: Setup SSL Certificate
echo -e "\n${YELLOW}[9/10] Setting up SSL certificate...${NC}"
if [ ! -d "/etc/letsencrypt/live/$DOMAIN" ]; then
  certbot certonly --nginx -d $DOMAIN --non-interactive --agree-tos --email noreply@example.com

  # Reload Nginx with SSL
  systemctl reload nginx
fi

# Setup auto-renewal
systemctl enable certbot.timer
systemctl start certbot.timer
echo -e "${GREEN}✓ SSL certificate configured${NC}"

# Step 10: Setup webhook receiver
echo -e "\n${YELLOW}[10/10] Setting up CI/CD webhook receiver...${NC}"

# Create webhook directory and files
mkdir -p $WEBHOOK_DIR/logs

cat > $WEBHOOK_DIR/package.json << 'PKGJSON'
{
  "name": "medico-webhook-receiver",
  "version": "1.0.0",
  "main": "webhook-receiver.js",
  "scripts": {
    "start": "node webhook-receiver.js"
  },
  "dependencies": {}
}
PKGJSON

# Create webhook ecosystem config
cat > $WEBHOOK_DIR/ecosystem.config.js << 'ECOCONFIG'
module.exports = {
  apps: [
    {
      name: 'medico-webhook',
      script: 'webhook-receiver.js',
      instances: 1,
      env: {
        NODE_ENV: 'production',
        WEBHOOK_PORT: '3001',
        GITHUB_WEBHOOK_SECRET: process.env.GITHUB_WEBHOOK_SECRET || 'change-this-secret'
      },
      error_file: 'logs/webhook-error.log',
      out_file: 'logs/webhook-out.log',
      autorestart: true
    }
  ]
};
ECOCONFIG

echo -e "${GREEN}✓ Webhook receiver configured${NC}"

# Setup deploy script
echo -e "\n${YELLOW}Creating deployment scripts...${NC}"
mkdir -p /opt/scripts

cat > /opt/scripts/deploy.sh << 'DEPLOYSH'
#!/bin/bash
DEPLOY_DIR="/var/www/medico-backend"
LOG_FILE="/var/log/medico-deploy.log"

log() {
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a $LOG_FILE
}

set -e
trap 'log "Deployment failed"; exit 1' ERR

log "=== Starting deployment ==="
cd $DEPLOY_DIR

git fetch origin main
git reset --hard HEAD
git checkout main
git pull origin main

log "Installing dependencies..."
npm ci --production || npm install --production

log "Generating Prisma client..."
npm run prisma:generate

log "Running migrations..."
npm run prisma:migrate -- --skip-generate 2>/dev/null || true

log "Restarting application..."
pm2 restart medico-api --wait-ready

sleep 2

if pm2 describe medico-api | grep -q "online"; then
  log "✓ Deployment successful"
  pm2 save
else
  log "✗ Application failed to start"
  pm2 logs medico-api --lines 50
  exit 1
fi
DEPLOYSH

chmod +x /opt/scripts/deploy.sh
echo -e "${GREEN}✓ Deployment scripts created${NC}"

# Setup Nginx webhook proxy
cat >> /etc/nginx/conf.d/webhook.conf << WEBHOOKCONF
upstream webhook {
    server 127.0.0.1:3001;
}

server {
    listen 80;
    server_name webhook.$DOMAIN;
    return 301 https://\$server_name\$request_uri;
}

server {
    listen 443 ssl http2;
    server_name webhook.$DOMAIN;

    ssl_certificate /etc/letsencrypt/live/$DOMAIN/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/$DOMAIN/privkey.pem;

    location /deploy {
        proxy_pass http://webhook;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
    }
}
WEBHOOKCONF

nginx -t && systemctl reload nginx

echo -e "\n${GREEN}╔════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║   Setup Complete!                       ║${NC}"
echo -e "${GREEN}╚════════════════════════════════════════╝${NC}"

echo -e "\n${YELLOW}Next steps:${NC}"
echo "1. Edit environment file: nano $DEPLOY_DIR/.env"
echo "2. Run database migrations: cd $DEPLOY_DIR && npm run prisma:migrate"
echo "3. Verify API is running: curl https://$DOMAIN"
echo "4. Setup GitHub webhook:"
echo "   - URL: https://api.ayuxacare.com/deploy"
echo "   - Secret: (generate and set in env)"
echo ""
echo -e "${YELLOW}Useful commands:${NC}"
echo "  pm2 status                    - Check app status"
echo "  pm2 logs medico-api           - View app logs"
echo "  pm2 logs medico-webhook       - View webhook logs"
echo "  systemctl status nginx        - Check Nginx status"
echo "  tail -f /var/log/medico-deploy.log - View deployment logs"
