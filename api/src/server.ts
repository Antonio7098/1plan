import Fastify from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';
import swagger from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';
import { randomUUID } from 'crypto';

import { config, isDevelopment } from './lib/config.js';
import { logger } from './lib/logger.js';
import { db } from './lib/db.js';
import { requestIdMiddleware } from './middleware/request-id.js';
import { errorHandler } from './middleware/error-handler.js';
import { healthRoutes } from './routes/health.js';
import { documentRoutes } from './routes/documents.js';
import { projectRoutes } from './routes/projects.js';
import { featureRoutes } from './routes/features.js';
import { sprintRoutes } from './routes/sprints.js';

// Create Fastify instance
const fastify = Fastify({
  logger: {
    level: config.LOG_LEVEL,
    transport: isDevelopment ? {
      target: 'pino-pretty',
      options: {
        colorize: true,
        ignore: 'pid,hostname',
        translateTime: 'SYS:standard',
      },
    } : undefined,
  },
  requestIdHeader: 'x-request-id',
  requestIdLogLabel: 'requestId',
  genReqId: () => randomUUID(),
});

// Global error handler
fastify.setErrorHandler(errorHandler);

// Request ID middleware
fastify.addHook('onRequest', requestIdMiddleware);

// Security middleware
await fastify.register(helmet, {
  contentSecurityPolicy: isDevelopment ? false : undefined,
});

// CORS
await fastify.register(cors, {
  origin: config.CORS_ORIGIN,
  credentials: true,
});

// Rate limiting
await fastify.register(rateLimit, {
  max: config.RATE_LIMIT_MAX,
  timeWindow: config.RATE_LIMIT_WINDOW,
  errorResponseBuilder: (request, context) => ({
    type: 'https://1plan.dev/errors/rate-limit-exceeded',
    title: 'Rate Limit Exceeded',
    status: 429,
    detail: `Too many requests. Try again in ${Math.round(context.ttl / 1000)} seconds.`,
    instance: request.url,
    requestId: (request as any).id,
  }),
});

// OpenAPI documentation
await fastify.register(swagger, {
  openapi: {
    info: {
      title: '1Plan API',
      description: 'API for managing project planning documents, features, and sprints',
      version: '1.0.0',
      contact: {
        name: '1Plan Team',
        url: 'https://github.com/Antonio7098/1plan',
      },
      license: {
        name: 'MIT',
        url: 'https://opensource.org/licenses/MIT',
      },
    },
    servers: [
      {
        url: isDevelopment ? `http://localhost:${config.PORT}` : 'https://api.1plan.dev',
        description: isDevelopment ? 'Development server' : 'Production server',
      },
    ],
    tags: [
      { name: 'Health', description: 'Health check endpoints' },
      { name: 'Projects', description: 'Project management' },
      { name: 'Documents', description: 'Document management' },
      { name: 'Features', description: 'Feature management' },
      { name: 'Sprints', description: 'Sprint management' },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
    },
  },
});

await fastify.register(swaggerUi, {
  routePrefix: '/docs',
  uiConfig: {
    docExpansion: 'list',
    deepLinking: false,
  },
  staticCSP: true,
  transformStaticCSP: (header) => header,
});

// Health check routes (no API prefix)
await fastify.register(healthRoutes);

// API routes with versioning
await fastify.register(async function (fastify) {
  await fastify.register(projectRoutes);
  await fastify.register(documentRoutes);
  await fastify.register(featureRoutes);
  await fastify.register(sprintRoutes);
}, { prefix: `${config.API_PREFIX}/${config.API_VERSION}` });

// Graceful shutdown handling
const gracefulShutdown = async (signal: string) => {
  logger.info(`Received ${signal}. Starting graceful shutdown...`);
  
  try {
    // Stop accepting new connections
    await fastify.close();
    
    // Close database connection
    await db.$disconnect();
    
    logger.info('Graceful shutdown completed');
    process.exit(0);
  } catch (error) {
    logger.error({ error }, 'Error during graceful shutdown');
    process.exit(1);
  }
};

// Register shutdown handlers
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Start server
async function start() {
  try {
    // Test database connection
    await db.$connect();
    logger.info('Database connected successfully');

    // Start the server
    const address = await fastify.listen({
      port: config.PORT,
      host: '0.0.0.0',
    });

    logger.info(`🚀 1Plan API server is running at ${address}`);
    logger.info(`📚 API documentation available at ${address}/docs`);
    logger.info(`💚 Health checks available at ${address}/health/live`);
    
  } catch (error) {
    logger.error({ error }, 'Failed to start server');
    process.exit(1);
  }
}

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled promise rejection:', reason);
  console.error('Promise:', promise);
  process.exit(1);
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('Uncaught exception:', error);
  process.exit(1);
});

// Start the server
start();
