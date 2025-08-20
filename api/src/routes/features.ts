import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { db } from '../lib/db.js';
import { FeatureStatus } from '@prisma/client';

// Validation schemas
const FeatureStatusEnum = z.enum(['PLANNED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED']);

const CreateFeatureSchema = z.object({
  projectId: z.string().min(1, 'Project ID is required'),
  featureId: z.string().min(1, 'Feature ID is required').regex(/^FEAT-\d+$/, 'Feature ID must match format FEAT-XXX'),
  title: z.string().min(1, 'Title is required').max(200, 'Title must be 200 characters or less'),
  version: z.string().optional().default('0.1.0'),
  status: FeatureStatusEnum.optional().default('PLANNED'),
  area: z.string().min(1, 'Area is required').max(100, 'Area must be 100 characters or less'),
});

const UpdateFeatureSchema = z.object({
  featureId: z.string().regex(/^FEAT-\d+$/, 'Feature ID must match format FEAT-XXX').optional(),
  title: z.string().min(1, 'Title is required').max(200, 'Title must be 200 characters or less').optional(),
  version: z.string().optional(),
  status: FeatureStatusEnum.optional(),
  area: z.string().min(1, 'Area is required').max(100, 'Area must be 100 characters or less').optional(),
});

const ListFeaturesQuerySchema = z.object({
  projectId: z.string().optional(),
  status: FeatureStatusEnum.optional(),
  area: z.string().optional(),
  limit: z.coerce.number().min(1).max(100).default(20),
  offset: z.coerce.number().min(0).default(0),
  sortBy: z.enum(['createdAt', 'updatedAt', 'title', 'featureId']).default('updatedAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

export async function featureRoutes(fastify: FastifyInstance) {
  // Create Feature
  fastify.post('/features', async (request, reply) => {
    const requestId = request.headers['x-request-id'] as string;
    const idempotencyKey = request.headers['x-idempotency-key'] as string;

    try {
      const data = CreateFeatureSchema.parse(request.body);

      // Check if project exists
      const project = await db.project.findUnique({
        where: { id: data.projectId },
      });

      if (!project) {
        return reply.status(404).send({
          type: 'https://1plan.dev/errors/not-found',
          title: 'Project Not Found',
          status: 404,
          detail: `Project with ID ${data.projectId} not found`,
          requestId,
        });
      }

      // Check for duplicate feature ID within project
      const existingFeature = await db.feature.findUnique({
        where: {
          projectId_featureId: {
            projectId: data.projectId,
            featureId: data.featureId,
          },
        },
      });

      if (existingFeature) {
        return reply.status(409).send({
          type: 'https://1plan.dev/errors/conflict',
          title: 'Feature Already Exists',
          status: 409,
          detail: `Feature ${data.featureId} already exists in project ${data.projectId}`,
          requestId,
        });
      }

      // Create feature
      const feature = await db.feature.create({
        data: {
          projectId: data.projectId,
          featureId: data.featureId,
          title: data.title,
          version: data.version,
          status: data.status as FeatureStatus,
          area: data.area,
        },
      });

      fastify.log.info({
        requestId,
        featureId: feature.id,
        projectId: feature.projectId,
        featureCode: feature.featureId,
      }, 'Feature created');

      reply.status(201).send({
        feature: {
          id: feature.id,
          projectId: feature.projectId,
          featureId: feature.featureId,
          title: feature.title,
          version: feature.version,
          status: feature.status,
          area: feature.area,
          createdAt: feature.createdAt.toISOString(),
          updatedAt: feature.updatedAt.toISOString(),
        },
      });
    } catch (error) {
      fastify.log.error({ requestId, error }, 'Error creating feature');
      
      if (error instanceof z.ZodError) {
        return reply.status(422).send({
          type: 'https://1plan.dev/errors/validation-failed',
          title: 'Validation Failed',
          status: 422,
          detail: 'Request body contains invalid data',
          requestId,
          issues: error.issues,
        });
      }

      return reply.status(500).send({
        type: 'https://1plan.dev/errors/internal-error',
        title: 'Internal Server Error',
        status: 500,
        detail: 'An unexpected error occurred while creating the feature',
        requestId,
      });
    }
  });

  // Get Feature by ID
  fastify.get('/features/:id', async (request, reply) => {
    const requestId = request.headers['x-request-id'] as string;
    const { id } = request.params as { id: string };

    try {
      const feature = await db.feature.findUnique({
        where: { id },
        include: {
          project: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      });

      if (!feature) {
        return reply.status(404).send({
          type: 'https://1plan.dev/errors/not-found',
          title: 'Feature Not Found',
          status: 404,
          detail: `Feature with ID ${id} not found`,
          requestId,
        });
      }

      reply.send({
        feature: {
          id: feature.id,
          projectId: feature.projectId,
          featureId: feature.featureId,
          title: feature.title,
          version: feature.version,
          status: feature.status,
          area: feature.area,
          createdAt: feature.createdAt.toISOString(),
          updatedAt: feature.updatedAt.toISOString(),
          project: feature.project,
        },
      });
    } catch (error) {
      fastify.log.error({ requestId, featureId: id, error }, 'Error retrieving feature');
      
      return reply.status(500).send({
        type: 'https://1plan.dev/errors/internal-error',
        title: 'Internal Server Error',
        status: 500,
        detail: 'An unexpected error occurred while retrieving the feature',
        requestId,
      });
    }
  });

  // List Features
  fastify.get('/features', async (request, reply) => {
    const requestId = request.headers['x-request-id'] as string;

    try {
      const query = ListFeaturesQuerySchema.parse(request.query);
      
      // Build where clause
      const where: any = {};
      if (query.projectId) where.projectId = query.projectId;
      if (query.status) where.status = query.status;
      if (query.area) where.area = { contains: query.area, mode: 'insensitive' };

      // Get total count
      const total = await db.feature.count({ where });

      // Get features with pagination
      const features = await db.feature.findMany({
        where,
        include: {
          project: {
            select: {
              id: true,
              name: true,
            },
          },
        },
        orderBy: {
          [query.sortBy]: query.sortOrder,
        },
        take: query.limit,
        skip: query.offset,
      });

      reply.send({
        features: features.map(feature => ({
          id: feature.id,
          projectId: feature.projectId,
          featureId: feature.featureId,
          title: feature.title,
          version: feature.version,
          status: feature.status,
          area: feature.area,
          createdAt: feature.createdAt.toISOString(),
          updatedAt: feature.updatedAt.toISOString(),
          project: feature.project,
        })),
        total,
        limit: query.limit,
        offset: query.offset,
      });
    } catch (error) {
      fastify.log.error({ requestId, error }, 'Error listing features');
      
      if (error instanceof z.ZodError) {
        return reply.status(422).send({
          type: 'https://1plan.dev/errors/validation-failed',
          title: 'Validation Failed',
          status: 422,
          detail: 'Query parameters contain invalid data',
          requestId,
          issues: error.issues,
        });
      }

      return reply.status(500).send({
        type: 'https://1plan.dev/errors/internal-error',
        title: 'Internal Server Error',
        status: 500,
        detail: 'An unexpected error occurred while listing features',
        requestId,
      });
    }
  });

  // Update Feature
  fastify.patch('/features/:id', async (request, reply) => {
    const requestId = request.headers['x-request-id'] as string;
    const { id } = request.params as { id: string };

    try {
      const updates = UpdateFeatureSchema.parse(request.body);

      // Check if feature exists
      const existingFeature = await db.feature.findUnique({
        where: { id },
      });

      if (!existingFeature) {
        return reply.status(404).send({
          type: 'https://1plan.dev/errors/not-found',
          title: 'Feature Not Found',
          status: 404,
          detail: `Feature with ID ${id} not found`,
          requestId,
        });
      }

      // If updating featureId, check for conflicts
      if (updates.featureId && updates.featureId !== existingFeature.featureId) {
        const conflictingFeature = await db.feature.findUnique({
          where: {
            projectId_featureId: {
              projectId: existingFeature.projectId,
              featureId: updates.featureId,
            },
          },
        });

        if (conflictingFeature) {
          return reply.status(409).send({
            type: 'https://1plan.dev/errors/conflict',
            title: 'Feature ID Conflict',
            status: 409,
            detail: `Feature ${updates.featureId} already exists in this project`,
            requestId,
          });
        }
      }

      // Update feature
      const feature = await db.feature.update({
        where: { id },
        data: {
          ...(updates.featureId && { featureId: updates.featureId }),
          ...(updates.title && { title: updates.title }),
          ...(updates.version && { version: updates.version }),
          ...(updates.status && { status: updates.status as FeatureStatus }),
          ...(updates.area && { area: updates.area }),
        },
      });

      fastify.log.info({
        requestId,
        featureId: feature.id,
        projectId: feature.projectId,
        featureCode: feature.featureId,
      }, 'Feature updated');

      reply.send({
        feature: {
          id: feature.id,
          projectId: feature.projectId,
          featureId: feature.featureId,
          title: feature.title,
          version: feature.version,
          status: feature.status,
          area: feature.area,
          createdAt: feature.createdAt.toISOString(),
          updatedAt: feature.updatedAt.toISOString(),
        },
      });
    } catch (error) {
      fastify.log.error({ requestId, featureId: id, error }, 'Error updating feature');
      
      if (error instanceof z.ZodError) {
        return reply.status(422).send({
          type: 'https://1plan.dev/errors/validation-failed',
          title: 'Validation Failed',
          status: 422,
          detail: 'Request body contains invalid data',
          requestId,
          issues: error.issues,
        });
      }

      return reply.status(500).send({
        type: 'https://1plan.dev/errors/internal-error',
        title: 'Internal Server Error',
        status: 500,
        detail: 'An unexpected error occurred while updating the feature',
        requestId,
      });
    }
  });

  // Delete Feature
  fastify.delete('/features/:id', async (request, reply) => {
    const requestId = request.headers['x-request-id'] as string;
    const { id } = request.params as { id: string };

    try {
      // Check if feature exists
      const existingFeature = await db.feature.findUnique({
        where: { id },
      });

      if (!existingFeature) {
        return reply.status(404).send({
          type: 'https://1plan.dev/errors/not-found',
          title: 'Feature Not Found',
          status: 404,
          detail: `Feature with ID ${id} not found`,
          requestId,
        });
      }

      // Delete feature
      await db.feature.delete({
        where: { id },
      });

      fastify.log.info({
        requestId,
        featureId: id,
        projectId: existingFeature.projectId,
        featureCode: existingFeature.featureId,
      }, 'Feature deleted');

      reply.status(204).send({});
    } catch (error) {
      fastify.log.error({ requestId, featureId: id, error }, 'Error deleting feature');
      
      return reply.status(500).send({
        type: 'https://1plan.dev/errors/internal-error',
        title: 'Internal Server Error',
        status: 500,
        detail: 'An unexpected error occurred while deleting the feature',
        requestId,
      });
    }
  });
}
