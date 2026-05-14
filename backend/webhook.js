const http = require('http');
const crypto = require('crypto');
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const SECRET = process.env.GITHUB_WEBHOOK_SECRET || '';
const PORT = process.env.WEBHOOK_PORT || 3001;
const DEPLOY_SCRIPT = '/home/api.ayuxacare.com/deploy.sh';

let deploymentInProgress = false;

const server = http.createServer((req, res) => {
  res.setHeader('Content-Type', 'application/json');

  // Health check
  if (req.method === 'GET' && req.url === '/health') {
    res.writeHead(200);
    res.end(JSON.stringify({ status: 'ok', timestamp: new Date().toISOString() }));
    return;
  }

  // Webhook endpoint
  if (req.method === 'POST' && req.url === '/deploy') {
    let body = '';

    req.on('data', chunk => {
      body += chunk.toString();
      if (body.length > 1024 * 1024) {
        req.connection.destroy();
      }
    });

    req.on('end', () => {
      try {
        const signature = req.headers['x-hub-signature-256'];

        if (!signature) {
          console.error('[WEBHOOK] Missing signature');
          res.writeHead(401);
          res.end(JSON.stringify({ error: 'Missing signature' }));
          return;
        }

        const hash = crypto.createHmac('sha256', SECRET).update(body).digest('hex');
        const expected = `sha256=${hash}`;

        if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) {
          console.error('[WEBHOOK] Invalid signature');
          res.writeHead(401);
          res.end(JSON.stringify({ error: 'Invalid signature' }));
          return;
        }

        const payload = JSON.parse(body);

        if (payload.ref !== 'refs/heads/main') {
          console.log(`[WEBHOOK] Ignoring push to ${payload.ref}`);
          res.writeHead(200);
          res.end(JSON.stringify({ message: 'Not main branch' }));
          return;
        }

        const changedFiles = payload.commits.flatMap(c => [
          ...(c.added || []),
          ...(c.modified || []),
          ...(c.removed || [])
        ]);

        const backendChanged = changedFiles.some(file => file.startsWith('backend/'));

        if (!backendChanged) {
          console.log('[WEBHOOK] No backend changes');
          res.writeHead(200);
          res.end(JSON.stringify({ message: 'No backend changes' }));
          return;
        }

        if (deploymentInProgress) {
          res.writeHead(202);
          res.end(JSON.stringify({ message: 'Deployment in progress' }));
          return;
        }

        console.log(`[WEBHOOK] Starting deployment...`);
        deploymentInProgress = true;
        res.writeHead(202);
        res.end(JSON.stringify({ message: 'Deployment started' }));

        runDeploy();

      } catch (error) {
        console.error('[WEBHOOK] Error:', error);
        res.writeHead(500);
        res.end(JSON.stringify({ error: 'Server error' }));
        deploymentInProgress = false;
      }
    });
  } else {
    res.writeHead(404);
    res.end(JSON.stringify({ error: 'Not found' }));
  }
});

function runDeploy() {
  console.log('[DEPLOY] Running deployment script...');

  const deploy = spawn('bash', [DEPLOY_SCRIPT], {
    stdio: ['ignore', 'pipe', 'pipe'],
    detached: false
  });

  deploy.stdout.on('data', (data) => {
    console.log(`[DEPLOY] ${data.toString().trim()}`);
  });

  deploy.stderr.on('data', (data) => {
    console.error(`[DEPLOY] ERROR: ${data.toString().trim()}`);
  });

  deploy.on('close', (code) => {
    deploymentInProgress = false;
    if (code === 0) {
      console.log('[DEPLOY] ✓ Deployment successful');
    } else {
      console.error(`[DEPLOY] ✗ Deployment failed with code ${code}`);
    }
  });

  deploy.on('error', (error) => {
    deploymentInProgress = false;
    console.error('[DEPLOY] Failed to start:', error);
  });
}

server.listen(PORT, '127.0.0.1', () => {
  console.log(`[WEBHOOK] Listening on port ${PORT}`);
  console.log(`[WEBHOOK] Health: http://localhost:${PORT}/health`);
  console.log(`[WEBHOOK] Deploy: http://localhost:${PORT}/deploy`);
});

process.on('SIGTERM', () => {
  console.log('[WEBHOOK] Shutting down...');
  server.close(() => process.exit(0));
});
