#!/bin/bash

# Medico Backend Deployment Script
# Run this on your VPS when webhook triggers deployment

set -e

DEPLOY_DIR="/var/www/medico-backend"
LOG_FILE="/var/log/medico-deploy.log"

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

log() {
  echo -e "${YELLOW}[$(date '+%Y-%m-%d %H:%M:%S')]${NC} $1" | tee -a $LOG_FILE
}

log_success() {
  echo -e "${GREEN}[$(date '+%Y-%m-%d %H:%M:%S')] ✓ $1${NC}" | tee -a $LOG_FILE
}

log_error() {
  echo -e "${RED}[$(date '+%Y-%m-%d %H:%M:%S')] ✗ $1${NC}" | tee -a $LOG_FILE
}

trap 'log_error "Deployment failed at line $LINENO"; exit 1' ERR

log "=== Starting Deployment ==="

if [ ! -d "$DEPLOY_DIR" ]; then
  log_error "Deploy directory not found: $DEPLOY_DIR"
  exit 1
fi

cd $DEPLOY_DIR

# Fetch and pull latest
log "Fetching latest changes..."
git fetch origin main
git reset --hard HEAD
git checkout main
git pull origin main

# Install dependencies
log "Installing dependencies..."
npm ci --production || npm install --production

# Generate Prisma
log "Generating Prisma client..."
npm run prisma:generate

# Run migrations
log "Running database migrations..."
npm run prisma:migrate -- --skip-generate 2>/dev/null || true

# Restart PM2
log "Restarting application..."
pm2 restart medico-api --wait-ready --listen-timeout 5000

sleep 2

if pm2 describe medico-api | grep -q "online"; then
  log_success "Deployment completed successfully"
  pm2 save
  exit 0
else
  log_error "Application failed to start"
  pm2 logs medico-api --lines 50
  exit 1
fi
