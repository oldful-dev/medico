#!/bin/bash

# Medico Backend - Quick VPS Setup
# Run as root on Hostinger VPS

set -e

DOMAIN="${1:-api.ayuxacare.com}"
REPO_URL="https://github.com/oldful-dev/medico.git"
DEPLOY_DIR="/home/api.ayuxacare.com"

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${YELLOW}╔════════════════════════════════════════╗${NC}"
echo -e "${YELLOW}║   Medico Backend - VPS Setup           ║${NC}"
echo -e "${YELLOW}╚════════════════════════════════════════╝${NC}"

# Check root
if [ "$EUID" -ne 0 ]; then
  echo -e "${RED}Must run as root${NC}"
  exit 1
fi

echo -e "\n${YELLOW}Configuration:${NC}"
echo "Domain: $DOMAIN"
echo "Deploy Dir: $DEPLOY_DIR"
echo "Repo: $REPO_URL"

read -p "Continue? (y/n) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
  exit 1
fi

# Update system
echo -e "\n${YELLOW}[1/8] Updating system...${NC}"
apt update && apt upgrade -y > /dev/null 2>&1
echo -e "${GREEN}✓${NC}"

# Install packages
echo -e "${YELLOW}[2/8] Installing packages...${NC}"
apt install -y curl wget git nodejs npm nginx redis-server certbot python3-certbot-nginx > /dev/null 2>&1
echo -e "${GREEN}✓ Node $(node -v), npm $(npm -v)${NC}"

# Create directories
echo -e "${YELLOW}[3/8] Creating directories...${NC}"
mkdir -p $DEPLOY_DIR /var/log/medico-api
echo -e "${GREEN}✓${NC}"

# Clone repo
echo -e "${YELLOW}[4/8] Cloning repository...${NC}"
if [ ! -d "$DEPLOY_DIR/.git" ]; then
  git clone --depth 1 --branch main $REPO_URL /tmp/medico-temp
  rm -rf /tmp/medico-temp/admin /tmp/medico-temp/client /tmp/medico-temp/mobile /tmp/medico-temp/.git
  cp -r /tmp/medico-temp/backend/* $DEPLOY_DIR/
  rm -rf /tmp/medico-temp
  cd $DEPLOY_DIR
  git init && git remote add origin $REPO_URL && git fetch origin main && git reset --hard origin/main
else
  cd $DEPLOY_DIR
  git fetch origin && git reset --hard origin/main
fi
echo -e "${GREEN}✓${NC}"

# Install Node deps
echo -e "${YELLOW}[5/8] Installing dependencies...${NC}"
cd $DEPLOY_DIR
npm install --production > /dev/null 2>&1
echo -e "${GREEN}✓${NC}"

# Setup PM2
echo -e "${YELLOW}[6/8] Setting up PM2...${NC}"
npm install -g pm2 > /dev/null 2>&1
cd $DEPLOY_DIR
pm2 start ecosystem.config.js
pm2 save
pm2 startup -u root --hp /root > /dev/null 2>&1
echo -e "${GREEN}✓${NC}"

# Setup Nginx
echo -e "${YELLOW}[7/8] Setting up Nginx...${NC}"
cat > /etc/nginx/sites-available/$DOMAIN << EOF
upstream medico_api {
    server localhost:3000;
}

upstream webhook {
    server 127.0.0.1:3001;
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

    add_header Strict-Transport-Security "max-age=31536000" always;

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
    }

    location /deploy {
        proxy_pass http://webhook;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
    }
}
EOF

ln -sf /etc/nginx/sites-available/$DOMAIN /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default

nginx -t && systemctl restart nginx
echo -e "${GREEN}✓${NC}"

# Setup SSL
echo -e "${YELLOW}[8/8] Setting up SSL...${NC}"
if [ ! -d "/etc/letsencrypt/live/$DOMAIN" ]; then
  certbot certonly --nginx -d $DOMAIN --non-interactive --agree-tos --email noreply@example.com > /dev/null 2>&1
  systemctl reload nginx
fi
systemctl enable certbot.timer > /dev/null 2>&1
echo -e "${GREEN}✓${NC}"

echo -e "\n${GREEN}╔════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║   Setup Complete!                       ║${NC}"
echo -e "${GREEN}╚════════════════════════════════════════╝${NC}"

echo -e "\n${YELLOW}Next steps:${NC}"
echo "1. Configure environment:"
echo "   cp $DEPLOY_DIR/.env.example $DEPLOY_DIR/.env"
echo "   nano $DEPLOY_DIR/.env"
echo ""
echo "2. Setup database:"
echo "   cd $DEPLOY_DIR"
echo "   npm run prisma:migrate"
echo ""
echo "3. Add GitHub webhook:"
echo "   URL: https://$DOMAIN/deploy"
echo "   Secret: (from GITHUB_WEBHOOK_SECRET in .env)"
echo ""
echo "4. Test API:"
echo "   curl https://$DOMAIN/health"
echo ""
echo -e "${YELLOW}Useful commands:${NC}"
echo "   cd $DEPLOY_DIR"
echo "   pm2 status              - Check services"
echo "   pm2 logs medico-api     - View API logs"
echo "   pm2 logs medico-webhook - View webhook logs"
