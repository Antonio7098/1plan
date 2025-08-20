import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import Fastify from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import { randomUUID } from 'crypto';

import { config } from '../lib/config.js';
import { db } from '../lib/db.js';
import { requestIdMiddleware } from '../middleware/request-id.js';
import { errorHandler } from '../middleware/error-handler.js';
import { healthRoutes } from '../routes/health.js';
import { documentRoutes } from '../routes/documents.js';
import { projectRoutes } from '../routes/projects.js';

describe('API Integration Tests', () => {
  let app: any;

  beforeAll(async () => {
    // Create test Fastify instance
    app = Fastify({
      logger: false, // Disable logging in tests
      requestIdHeader: 'x-request-id',
      requestIdLogLabel: 'requestId',
      genReqId: () => randomUUID(),
    });

    // Register middleware and routes
    app.setErrorHandler(errorHandler);
    app.addHook('onRequest', requestIdMiddleware);
    
    await app.register(cors, {
      origin: config.CORS_ORIGIN,
      credentials: true,
    });

    await app.register(helmet, {
      contentSecurityPolicy: false,
    });

    // Register routes
    await app.register(healthRoutes);
    await app.register(async function (fastify: any) {
      await fastify.register(projectRoutes);
      await fastify.register(documentRoutes);
    }, { prefix: `${config.API_PREFIX}/${config.API_VERSION}` });

    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('Health Endpoints', () => {
    it('GET /health/test should return ok', async () => {
      const response = await request(app.server)
        .get('/health/test')
        .expect(200);

      expect(response.body).toEqual({
        status: 'ok',
        timestamp: expect.any(String)
      });
    });

    it('GET /health/live should return health status', async () => {
      const response = await request(app.server)
        .get('/health/live')
        .expect(200);

      expect(response.body).toMatchObject({
        status: expect.stringMatching(/^(healthy|unhealthy)$/),
        timestamp: expect.any(String),
        version: expect.any(String),
        uptime: expect.any(Number),
        checks: {
          database: {
            status: expect.stringMatching(/^(healthy|unhealthy)$/),
            responseTime: expect.any(Number)
          }
        }
      });
    });
  });

  describe('Project Endpoints', () => {
    it('POST /api/v1/projects should create project', async () => {
      const projectData = {
        name: 'Test Project'
      };

      const response = await request(app.server)
        .post('/api/v1/projects')
        .send(projectData)
        .expect(201);

      expect(response.body).toMatchObject({
        id: expect.any(String),
        name: 'Test Project',
        createdAt: expect.any(String),
        updatedAt: expect.any(String)
      });
    });

    it('POST /api/v1/projects should validate required fields', async () => {
      const response = await request(app.server)
        .post('/api/v1/projects')
        .send({})
        .expect(400);

      expect(response.body).toMatchObject({
        error: 'Validation failed'
      });
    });

    it('GET /api/v1/projects should list projects', async () => {
      const response = await request(app.server)
        .get('/api/v1/projects')
        .expect(200);

      expect(response.body).toMatchObject({
        projects: expect.any(Array),
        total: expect.any(Number)
      });
    });
  });

  describe('Document Endpoints', () => {
    let testProject: any;

    beforeAll(async () => {
      // Create a test project for documents
      testProject = await db.project.create({
        data: { name: 'Test Project for Documents' }
      });
    });

    it('POST /api/v1/documents should create document', async () => {
      const documentData = {
        projectId: testProject.id,
        kind: 'FREEFORM',
        title: 'Test Document',
        content: 'This is test content'
      };

      const response = await request(app.server)
        .post('/api/v1/documents')
        .send(documentData)
        .expect(201);

      expect(response.body).toMatchObject({
        id: expect.any(String),
        projectId: testProject.id,
        kind: 'FREEFORM',
        title: 'Test Document',
        content: 'This is test content',
        slug: 'test-document',
        createdAt: expect.any(String),
        updatedAt: expect.any(String)
      });
    });

    it('POST /api/v1/documents should validate required fields', async () => {
      const response = await request(app.server)
        .post('/api/v1/documents')
        .send({})
        .expect(400);

      expect(response.body).toMatchObject({
        error: 'Validation failed'
      });
    });

    it('GET /api/v1/documents should list documents', async () => {
      const response = await request(app.server)
        .get('/api/v1/documents')
        .expect(200);

      expect(response.body).toMatchObject({
        documents: expect.any(Array),
        total: expect.any(Number)
      });
    });
  });

  describe('Error Handling', () => {
    it('should return 404 for non-existent routes', async () => {
      const response = await request(app.server)
        .get('/api/v1/non-existent')
        .expect(404);
    });

    it('should include request ID in error responses', async () => {
      const response = await request(app.server)
        .post('/api/v1/projects')
        .send({}) // Invalid data to trigger validation error
        .expect(400);

      expect(response.headers['x-request-id']).toBeDefined();
    });
  });
});
