const http = require('http');
const crypto = require('crypto');
const { execSync, spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const SECRET = process.env.GITHUB_WEBHOOK_SECRET || 'change-this-secret';
const PORT = process.env.WEBHOOK_PORT || 3001;
const DEPLOY_SCRIPT = '/opt/scripts/deploy.sh';

// Deployment in progress flag
let deploymentInProgress = false;

const server = http.createServer((req, res) => {
  // CORS and basic routing
  res.setHeader('Content-Type', 'application/json');

  // Health check endpoint
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
      // Prevent payload from being too large
      if (body.length > 1024 * 1024) {
        req.connection.destroy();
      }
    });

    req.on('end', () => {
      try {
        // Verify GitHub signature
        const signature = req.headers['x-hub-signature-256'];

        if (!signature) {
          console.error('[WEBHOOK] Missing signature header');
          res.writeHead(401);
          res.end(JSON.stringify({ error: 'Missing signature' }));
          return;
        }

        const hash = crypto
          .createHmac('sha256', SECRET)
          .update(body)
          .digest('hex');

        const expected = `sha256=${hash}`;

        if (!crypto.timingSafeEqual(signature, expected)) {
          console.error('[WEBHOOK] Invalid signature');
          res.writeHead(401);
          res.end(JSON.stringify({ error: 'Invalid signature' }));
          return;
        }

        const payload = JSON.parse(body);

        // Only deploy on push to main
        if (payload.ref !== 'refs/heads/main') {
          console.log(`[WEBHOOK] Ignoring push to ${payload.ref}`);
          res.writeHead(200);
          res.end(JSON.stringify({ message: 'Not main branch, skipping deployment' }));
          return;
        }

        // Check if backend files changed
        const changedFiles = payload.commits.flatMap(c => [
          ...(c.added || []),
          ...(c.modified || []),
          ...(c.removed || [])
        ]);

        const backendChanged = changedFiles.some(file => file.startsWith('backend/'));

        if (!backendChanged) {
          console.log('[WEBHOOK] No backend changes detected');
          res.writeHead(200);
          res.end(JSON.stringify({ message: 'No backend changes, skipping deployment' }));
          return;
        }

        if (deploymentInProgress) {
          console.log('[WEBHOOK] Deployment already in progress');
          res.writeHead(202);
          res.end(JSON.stringify({ message: 'Deployment already in progress' }));
          return;
        }

        // Start deployment
        console.log(`[WEBHOOK] Backend changes detected. Starting deployment...`);
        console.log(`[WEBHOOK] Commit: ${payload.commits[0]?.message || 'N/A'}`);

        deploymentInProgress = true;
        res.writeHead(202);
        res.end(JSON.stringify({ message: 'Deployment started', id: Date.now() }));

        // Run deployment script asynchronously
        deployApplication();

      } catch (error) {
        console.error('[WEBHOOK] Error processing webhook:', error);
        res.writeHead(500);
        res.end(JSON.stringify({ error: 'Internal server error' }));
        deploymentInProgress = false;
      }
    });
  } else {
    res.writeHead(404);
    res.end(JSON.stringify({ error: 'Not found' }));
  }
});

// Deployment function
function deployApplication() {
  console.log('[DEPLOY] Starting deployment process...');

  const deploy = spawn('bash', [DEPLOY_SCRIPT], {
    stdio: ['ignore', 'pipe', 'pipe'],
    detached: false
  });

  let output = '';
  let errorOutput = '';

  deploy.stdout.on('data', (data) => {
    const message = data.toString();
    console.log(`[DEPLOY] ${message.trim()}`);
    output += message;
  });

  deploy.stderr.on('data', (data) => {
    const message = data.toString();
    console.error(`[DEPLOY] ERROR: ${message.trim()}`);
    errorOutput += message;
  });

  deploy.on('close', (code) => {
    deploymentInProgress = false;

    if (code === 0) {
      console.log('[DEPLOY] ✓ Deployment completed successfully');
      logDeploymentEvent('success', output);
    } else {
      console.error(`[DEPLOY] ✗ Deployment failed with code ${code}`);
      logDeploymentEvent('failure', errorOutput);
    }
  });

  deploy.on('error', (error) => {
    deploymentInProgress = false;
    console.error('[DEPLOY] Failed to start deployment:', error);
    logDeploymentEvent('error', error.message);
  });
}

// Log deployment events
function logDeploymentEvent(status, message) {
  const logDir = '/var/log/medico-deployments';

  try {
    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir, { recursive: true });
    }

    const timestamp = new Date().toISOString();
    const logFile = path.join(logDir, `deployment-${new Date().toISOString().split('T')[0]}.log`);

    const logEntry = `\n[${timestamp}] Status: ${status}\n${message}\n${'='.repeat(80)}`;
    fs.appendFileSync(logFile, logEntry);
  } catch (error) {
    console.error('Failed to write deployment log:', error);
  }
}

server.listen(PORT, '127.0.0.1', () => {
  console.log(`[WEBHOOK] Receiver listening on port ${PORT}`);
  console.log(`[WEBHOOK] Health check: http://localhost:${PORT}/health`);
  console.log(`[WEBHOOK] Deployment endpoint: http://localhost:${PORT}/deploy`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('[WEBHOOK] Shutting down gracefully...');
  server.close(() => {
    console.log('[WEBHOOK] Server closed');
    process.exit(0);
  });
});
