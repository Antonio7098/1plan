import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import Fastify from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';
import { randomUUID } from 'crypto';

import { config } from '../lib/config.js';
import { requestIdMiddleware } from '../middleware/request-id.js';
import { errorHandler } from '../middleware/error-handler.js';
import { healthRoutes } from '../routes/health.js';
import { metricsRoutes } from '../routes/metrics.js';
import { register } from '../lib/metrics.js';

// Observability and guardrails integration tests

describe('Observability & Guardrails', () => {
  describe('/metrics endpoint', () => {
    let app: any;

    beforeAll(async () => {
      app = Fastify({
        logger: false,
        requestIdHeader: 'x-request-id',
        requestIdLogLabel: 'requestId',
        genReqId: () => randomUUID(),
      });

      app.setErrorHandler(errorHandler);
      app.addHook('onRequest', requestIdMiddleware);

      await app.register(helmet, { contentSecurityPolicy: false });
      await app.register(cors, {
        origin: config.CORS_ORIGIN,
        credentials: true,
      });

      await app.register(metricsRoutes);
      await app.register(healthRoutes);

      await app.ready();
    });

    afterAll(async () => {
      await app.close();
    });

    it('returns Prometheus text format with correct content-type', async () => {
      const res = await request(app.server)
        .get('/metrics')
        .expect(200);

      expect(res.headers['content-type']).toContain(register.contentType.split(';')[0]);
      expect(res.text).toContain('# HELP');
      // default metrics should be present
      expect(res.text).toMatch(/process_cpu_user_seconds_total|nodejs_version_info/);
    });
  });

  describe('Rate limiting', () => {
    let app: any;

    beforeAll(async () => {
      app = Fastify({
        logger: false,
        requestIdHeader: 'x-request-id',
        requestIdLogLabel: 'requestId',
        genReqId: () => randomUUID(),
      });

      app.setErrorHandler(errorHandler);
      app.addHook('onRequest', requestIdMiddleware);

      await app.register(helmet, { contentSecurityPolicy: false });
      await app.register(cors, {
        origin: config.CORS_ORIGIN,
        credentials: true,
      });

      // Tight rate limit for testing: 1 request per second
      await app.register(rateLimit, {
        max: 1,
        timeWindow: 1000,
        throw: false,
        errorResponseBuilder: (request, context) => ({
          type: 'https://1plan.dev/errors/rate-limit-exceeded',
          title: 'Rate Limit Exceeded',
          statusCode: 429,
          error: 'Too Many Requests',
          message: `Rate limit exceeded, retry in ${context.after ?? Math.round(context.ttl / 1000) + 's'}`,
          detail: `Too many requests. Try again in ${Math.round(context.ttl / 1000)} seconds.`,
          instance: request.url,
          requestId: (request as any).id,
        }),
      });

      await app.register(healthRoutes);

      await app.ready();
    });

    afterAll(async () => {
      await app.close();
    });

    it('returns 429 and Retry-After when limit exceeded', async () => {
      await request(app.server).get('/health/test').expect(200);
      const res = await request(app.server).get('/health/test').expect(429);

      expect(res.headers['retry-after']).toBeDefined();
      expect(res.body).toMatchObject({
        statusCode: 429,
        title: expect.stringMatching(/Rate Limit/i),
      });
    });
  });

  describe('Security headers and CORS', () => {
    let app: any;

    beforeAll(async () => {
      app = Fastify({
        logger: false,
        requestIdHeader: 'x-request-id',
        requestIdLogLabel: 'requestId',
        genReqId: () => randomUUID(),
      });

      app.setErrorHandler(errorHandler);
      app.addHook('onRequest', requestIdMiddleware);

      await app.register(helmet, { contentSecurityPolicy: false });
      await app.register(cors, {
        origin: config.CORS_ORIGIN,
        credentials: true,
      });

      await app.register(healthRoutes);

      await app.ready();
    });

    afterAll(async () => {
      await app.close();
    });

    it('sets common security headers (helmet)', async () => {
      const res = await request(app.server).get('/health/test').expect(200);

      expect(res.headers['x-content-type-options']).toBe('nosniff');
      // Helmet v7+: check for a couple of common headers without assuming full set
      expect(res.headers['x-dns-prefetch-control']).toBeDefined();
      expect(res.headers['x-download-options']).toBeDefined();
    });

    it('applies CORS policy and credentials', async () => {
      const origin = config.CORS_ORIGIN;
      const res = await request(app.server)
        .get('/health/test')
        .set('Origin', origin)
        .expect(200);

      expect(res.headers['access-control-allow-origin']).toBe(origin);
      expect(String(res.headers['access-control-allow-credentials'])).toBe('true');
    });
  });
});
