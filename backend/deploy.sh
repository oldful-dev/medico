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

# Copy backend files. src/ and prisma/ are pure code, so replace them wholesale —
# otherwise files deleted/renamed upstream linger on the server and old code
# keeps running next to the new build.
rm -rf src prisma
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
# Fail the deploy BEFORE restarting if migrations fail: the old process keeps
# serving, instead of new code silently running against an old schema.
if ! npx prisma migrate deploy >> "$LOG_FILE" 2>&1; then
  log "MIGRATION FAILED - aborting deploy, running app left untouched. See $LOG_FILE"
  exit 1
fi

APP_NAME="ayuxacare-api"

# Guard against two API processes (e.g. an old pm2 name still running next to a
# new one) serving the same port with different code versions.
API_PROCS=$(pm2 jlist 2>/dev/null | node -e '
let d="";process.stdin.on("data",c=>d+=c).on("end",()=>{
  try{const l=JSON.parse(d).filter(p=>/server\.js$/.test((p.pm2_env||{}).pm_exec_path||""));
  console.log([...new Set(l.map(p=>p.name))].join(","));}catch(e){console.log("");}
});')
log "Running API processes: ${API_PROCS:-none}"
if [ -n "$API_PROCS" ] && [ "$API_PROCS" != "$APP_NAME" ]; then
  log "UNEXPECTED API process set ($API_PROCS, expected $APP_NAME) - refusing to restart. Remove duplicates with 'pm2 delete <name>' first."
  exit 1
fi

log "Restarting application..."
pm2 restart "$APP_NAME" --wait-ready --listen-timeout 5000

sleep 2

if pm2 describe "$APP_NAME" | grep -q "online"; then
  log "Deployment completed successfully"
  pm2 save
  exit 0
else
  log "Application failed to start"
  exit 1
fi
