#!/bin/bash

set -e

DEPLOY_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
LOG_FILE="$DEPLOY_DIR/logs/deploy.log"

log() {
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a $LOG_FILE
}

trap 'log "Deployment failed at line $LINENO"; exit 1' ERR

log "=== Starting Deployment ==="
cd $DEPLOY_DIR

log "Fetching backend files from GitHub..."
git fetch origin main
git checkout origin/main -- backend/

log "Syncing files (keeping local scripts)..."
# Backup local scripts
cp deploy.sh /tmp/deploy.sh.bak
cp webhook.js /tmp/webhook.js.bak
cp ecosystem.config.js /tmp/ecosystem.config.js.bak

# Copy backend files
cp -rf backend/* .
rm -rf backend

# Restore local scripts
cp /tmp/deploy.sh.bak deploy.sh
cp /tmp/webhook.js.bak webhook.js
cp /tmp/ecosystem.config.js.bak ecosystem.config.js

log "Installing dependencies..."
npm ci --production || npm install --production

log "Generating Prisma client..."
npx prisma generate

log "Running migrations..."
npx prisma migrate deploy 2>/dev/null || true

log "Restarting application..."
pm2 restart ayuxacare-api --wait-ready --listen-timeout 5000

sleep 2

if pm2 describe ayuxacare-api | grep -q "online"; then
  log "Deployment completed successfully"
  pm2 save
  exit 0
else
  log "Application failed to start"
  exit 1
fi
