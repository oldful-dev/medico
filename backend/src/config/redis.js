const Redis = require('ioredis');
const { logger } = require('./logger');

const redisOptions = {
    // Falls back to localhost default
    host: process.env.REDIS_HOST || '127.0.0.1',
    port: process.env.REDIS_PORT || 6379,
    password: process.env.REDIS_PASSWORD || undefined,
    maxRetriesPerRequest: null, // Required by BullMQ
    tls: (process.env.REDIS_URL || '').startsWith('rediss://') ? {} : undefined
};

const connection = process.env.REDIS_URL 
    ? new Redis(process.env.REDIS_URL, { maxRetriesPerRequest: null, tls: (process.env.REDIS_URL || '').startsWith('rediss://') ? {} : undefined })
    : new Redis(redisOptions);

connection.on('error', (err) => {
    logger.error(`[Redis] Connection error: ${err.message}`);
});

connection.on('ready', () => {
    logger.info(`[Redis] Connected`);
});

module.exports = { connection };
