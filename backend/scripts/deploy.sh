#!/bin/bash

# Deployment script for Medico API
# This script is triggered by GitHub webhook on push to main branch

DEPLOY_DIR="/var/www/medico-backend"
LOG_FILE="/var/log/medico-deploy.log"

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

# Logging function
log() {
  echo -e "${YELLOW}[$(date '+%Y-%m-%d %H:%M:%S')]${NC} $1" | tee -a $LOG_FILE
}

log_success() {
  echo -e "${GREEN}[$(date '+%Y-%m-%d %H:%M:%S')] ✓ $1${NC}" | tee -a $LOG_FILE
}

log_error() {
  echo -e "${RED}[$(date '+%Y-%m-%d %H:%M:%S')] ✗ $1${NC}" | tee -a $LOG_FILE
}

# Error handling
set -e
trap 'log_error "Deployment failed at line $LINENO"; exit 1' ERR

log "=== Starting Medico API Deployment ==="

# Check if deploy directory exists
if [ ! -d "$DEPLOY_DIR" ]; then
  log_error "Deploy directory does not exist: $DEPLOY_DIR"
  exit 1
fi

cd $DEPLOY_DIR
log "Working directory: $DEPLOY_DIR"

# Fetch latest changes
log "Fetching latest changes from GitHub..."
git fetch origin main

# Check if backend folder changed
if ! git diff --name-only origin/main...HEAD | grep -q "^backend/" && [ "$(git rev-parse HEAD)" == "$(git rev-parse origin/main)" ]; then
  log_success "Already up to date. No deployment needed."
  exit 0
fi

# Reset and pull
log "Checking out latest main branch..."
git reset --hard HEAD
git checkout main
git pull origin main

# Install dependencies
log "Installing dependencies..."
npm ci --production || npm install --production

# Generate Prisma client
log "Generating Prisma client..."
npm run prisma:generate

# Run migrations
log "Running database migrations..."
npm run prisma:migrate -- --skip-generate 2>/dev/null || {
  log "No migrations to run or migrations failed. Continuing..."
}

# Restart PM2 application
log "Restarting PM2 application..."
pm2 restart medico-api --wait-ready --listen-timeout 5000

# Wait a moment for restart
sleep 2

# Verify app is running
if pm2 describe medico-api | grep -q "online"; then
  log_success "Application restarted successfully"
  pm2 save
  log_success "=== Deployment Completed Successfully ==="
  exit 0
else
  log_error "Application failed to start"
  pm2 logs medico-api --lines 50
  exit 1
fi
