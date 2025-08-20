import { PrismaClient } from '@prisma/client';
import { logger } from './logger.js';
import { config } from './config.js';

declare global {
   
  var __prisma: PrismaClient | undefined;
}

// Database connection with connection pooling
export const db = globalThis.__prisma ?? new PrismaClient({
  log: [
    { level: 'query', emit: 'event' },
    { level: 'error', emit: 'stdout' },
    { level: 'warn', emit: 'stdout' },
  ],
  datasources: {
    db: {
      url: config.DATABASE_URL,
    },
  },
});

// Log database queries in development
if (config.NODE_ENV === 'development') {
  (db as any).$on('query', (e: any) => {
    logger.debug({ 
      query: e.query, 
      params: e.params, 
      duration: `${e.duration}ms` 
    }, 'Database query');
  });
}

// Prevent multiple instances in development
if (config.NODE_ENV === 'development') {
  globalThis.__prisma = db;
}

// Graceful shutdown handling
process.on('beforeExit', async () => {
  logger.info('Disconnecting from database...');
  await db.$disconnect();
});

// Health check function
export async function checkDatabaseHealth(): Promise<boolean> {
  try {
    await db.$queryRaw`SELECT 1 as test`;
    return true;
  } catch (error) {
    // Use console.error for now to avoid circular dependency with logger
    console.error('Database health check failed:', error);
    return false;
  }
}

