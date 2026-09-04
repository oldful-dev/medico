// Prisma Client Singleton
const { PrismaClient } = require('@prisma/client');
const { logger } = require('./logger');

const prisma = new PrismaClient({
    log: process.env.NODE_ENV === 'development'
        ? [{ level: 'query', emit: 'event' }, { level: 'warn', emit: 'event' }, { level: 'error', emit: 'event' }]
        : [{ level: 'error', emit: 'event' }],
    datasources: {
        db: {
            url: process.env.DATABASE_URL,
        }
    }
});

// Route Prisma's own connection/query errors into winston — otherwise DB
// connection failures in production only ever reach raw stdout.
prisma.$on('error', (e) => logger.error('Prisma error', { message: e.message }));
if (process.env.NODE_ENV === 'development') {
    prisma.$on('warn', (e) => logger.warn('Prisma warning', { message: e.message }));
}

// Handle graceful shutdown
process.on('SIGINT', async () => {
    await prisma.$disconnect();
    process.exit(0);
});

process.on('SIGTERM', async () => {
    await prisma.$disconnect();
    process.exit(0);
});

module.exports = prisma;
