module.exports = {
  apps: [
    {
      name: 'medico-webhook',
      script: 'webhook-receiver.js',
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'production',
        WEBHOOK_PORT: '3001',
        GITHUB_WEBHOOK_SECRET: process.env.GITHUB_WEBHOOK_SECRET || 'change-this-secret'
      },
      error_file: 'logs/webhook-error.log',
      out_file: 'logs/webhook-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
      autorestart: true,
      max_restarts: 10,
      min_uptime: '10s',
      watch: false
    }
  ]
};
