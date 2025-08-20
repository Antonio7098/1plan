import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { checkDatabaseHealth } from '../lib/db.js';
import { config } from '../lib/config.js';

// Health response schema for future OpenAPI integration
// const healthResponseSchema = z.object({
//   status: z.enum(['healthy', 'unhealthy']),
//   timestamp: z.string(),
//   version: z.string(),
//   uptime: z.number(),
//   checks: z.object({
//     database: z.object({
//       status: z.enum(['healthy', 'unhealthy']),
//       responseTime: z.number().optional(),
//     }),
//   }),
// });

export async function healthRoutes(fastify: FastifyInstance) {
  // Simple test endpoint first
  fastify.get('/health/test', async () => {
    return { status: 'ok', timestamp: new Date().toISOString() };
  });

  // Liveness probe - basic server health
  fastify.get('/health/live', async (request, reply) => {
    try {
      const startTime = Date.now();
      
      let health = {
        status: 'healthy' as 'healthy' | 'unhealthy',
        timestamp: new Date().toISOString(),
        version: process.env.npm_package_version || '0.1.0',
        uptime: process.uptime(),
        checks: {
          database: {
            status: 'checking' as 'healthy' | 'unhealthy' | 'checking',
            responseTime: 0,
          },
        },
      };

      // Quick database check with timeout
      const dbStart = Date.now();
      try {
        const dbHealthy = await Promise.race([
          checkDatabaseHealth(),
          new Promise<boolean>((_, reject) => 
            setTimeout(() => reject(new Error('Database check timeout')), 2000)
          ),
        ]);
        
        const dbResponseTime = Date.now() - dbStart;
        health.checks.database = {
          status: dbHealthy ? 'healthy' : 'unhealthy',
          responseTime: dbResponseTime,
        };

        if (!dbHealthy) {
          health.status = 'unhealthy';
          reply.status(503);
        }
      } catch (dbError) {
        const dbResponseTime = Date.now() - dbStart;
        health.checks.database = {
          status: 'unhealthy',
          responseTime: dbResponseTime,
        };
        health.status = 'unhealthy';
        reply.status(503);
        request.log.warn({ error: dbError }, 'Database check failed');
      }

      const totalTime = Date.now() - startTime;
      request.log.debug({ responseTime: totalTime }, 'Health check completed');

      return health;
    } catch (error) {
      console.error('Health check error:', error);
      reply.status(500);
      return {
        status: 'error',
        timestamp: new Date().toISOString(),
        error: (error as Error)?.message || 'Unknown error',
      };
    }
  });

  // Readiness probe - detailed health check
  fastify.get('/health/ready', async (request, reply) => {
    const startTime = Date.now();
    let isHealthy = true;

    let health = {
      status: 'healthy' as 'healthy' | 'unhealthy',
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version || '0.1.0',
      uptime: process.uptime(),
      checks: {
        database: {
          status: 'healthy' as 'healthy' | 'unhealthy',
          responseTime: 0,
        },
      },
    };

    // Database health check with timeout
    const dbStart = Date.now();
    try {
      const dbHealthy = await Promise.race([
        checkDatabaseHealth(),
        new Promise<boolean>((_, reject) => 
          setTimeout(() => reject(new Error('Timeout')), config.HEALTH_CHECK_TIMEOUT)
        ),
      ]);

      const dbResponseTime = Date.now() - dbStart;
      health.checks.database = {
        status: dbHealthy ? 'healthy' : 'unhealthy',
        responseTime: dbResponseTime,
      };

      if (!dbHealthy) {
        isHealthy = false;
      }
    } catch (error) {
      const dbResponseTime = Date.now() - dbStart;
      health.checks.database = {
        status: 'unhealthy',
        responseTime: dbResponseTime,
      };
      isHealthy = false;
      request.log.warn({ error }, 'Database health check failed');
    }

    if (!isHealthy) {
      health.status = 'unhealthy';
      reply.status(503);
    }

    const totalTime = Date.now() - startTime;
    request.log.debug({ responseTime: totalTime }, 'Readiness check completed');

    return health;
  });

  // Startup probe - minimal check for container orchestration
  fastify.get('/health/startup', async () => {
    // Simple check that the server is responding
    return {
      status: 'ready',
      timestamp: new Date().toISOString(),
    };
  });
}
