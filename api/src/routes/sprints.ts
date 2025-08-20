import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { db } from '../lib/db.js';
import { SprintStatus } from '@prisma/client';

// Validation schemas
const SprintStatusEnum = z.enum(['PLANNED', 'ACTIVE', 'DONE', 'CANCELLED']);

const SprintItemSchema = z.object({
  text: z.string().min(1, 'Item text is required').max(500, 'Item text must be 500 characters or less'),
  checked: z.boolean().default(false),
  order: z.number().int().min(0).default(0),
});

const CreateSprintSchema = z.object({
  projectId: z.string().min(1, 'Project ID is required'),
  code: z.string().min(1, 'Sprint code is required').regex(/^SPR-\d+$/, 'Sprint code must match format SPR-XXX'),
  name: z.string().min(1, 'Name is required').max(200, 'Name must be 200 characters or less'),
  status: SprintStatusEnum.optional().default('PLANNED'),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  items: z.array(SprintItemSchema).optional().default([]),
});

const UpdateSprintSchema = z.object({
  code: z.string().regex(/^SPR-\d+$/, 'Sprint code must match format SPR-XXX').optional(),
  name: z.string().min(1, 'Name is required').max(200, 'Name must be 200 characters or less').optional(),
  status: SprintStatusEnum.optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  items: z.array(SprintItemSchema).optional(),
});

const ListSprintsQuerySchema = z.object({
  projectId: z.string().optional(),
  status: SprintStatusEnum.optional(),
  limit: z.coerce.number().min(1).max(100).default(20),
  offset: z.coerce.number().min(0).default(0),
  sortBy: z.enum(['createdAt', 'updatedAt', 'name', 'code', 'startDate']).default('updatedAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

export async function sprintRoutes(fastify: FastifyInstance) {
  // Create Sprint
  fastify.post('/sprints', async (request, reply) => {
    const requestId = request.headers['x-request-id'] as string;
    const idempotencyKey = request.headers['x-idempotency-key'] as string;

    try {
      const data = CreateSprintSchema.parse(request.body);

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

      // Check for duplicate sprint code within project
      const existingSprint = await db.sprint.findUnique({
        where: {
          projectId_code: {
            projectId: data.projectId,
            code: data.code,
          },
        },
      });

      if (existingSprint) {
        return reply.status(409).send({
          type: 'https://1plan.dev/errors/conflict',
          title: 'Sprint Already Exists',
          status: 409,
          detail: `Sprint ${data.code} already exists in project ${data.projectId}`,
          requestId,
        });
      }

      // Validate date logic
      if (data.startDate && data.endDate) {
        const startDate = new Date(data.startDate);
        const endDate = new Date(data.endDate);
        
        if (endDate <= startDate) {
          return reply.status(422).send({
            type: 'https://1plan.dev/errors/validation-failed',
            title: 'Validation Failed',
            status: 422,
            detail: 'End date must be after start date',
            requestId,
          });
        }
      }

      // Create sprint with items in a transaction
      const sprint = await db.$transaction(async (tx) => {
        const newSprint = await tx.sprint.create({
          data: {
            projectId: data.projectId,
            code: data.code,
            name: data.name,
            status: data.status as SprintStatus,
            startDate: data.startDate ? new Date(data.startDate) : null,
            endDate: data.endDate ? new Date(data.endDate) : null,
          },
        });

        // Create sprint items if provided
        const items = [];
        if (data.items && data.items.length > 0) {
          for (let i = 0; i < data.items.length; i++) {
            const item = data.items[i];
            const createdItem = await tx.sprintItem.create({
              data: {
                sprintId: newSprint.id,
                text: item.text,
                checked: item.checked,
                order: item.order || i,
              },
            });
            items.push(createdItem);
          }
        }

        return { ...newSprint, items };
      });

      fastify.log.info({
        requestId,
        sprintId: sprint.id,
        projectId: sprint.projectId,
        sprintCode: sprint.code,
        itemCount: sprint.items.length,
      }, 'Sprint created');

      reply.status(201).send({
        sprint: {
          id: sprint.id,
          projectId: sprint.projectId,
          code: sprint.code,
          name: sprint.name,
          status: sprint.status,
          startDate: sprint.startDate?.toISOString() || null,
          endDate: sprint.endDate?.toISOString() || null,
          createdAt: sprint.createdAt.toISOString(),
          updatedAt: sprint.updatedAt.toISOString(),
          items: sprint.items.map(item => ({
            id: item.id,
            text: item.text,
            checked: item.checked,
            order: item.order,
            createdAt: item.createdAt.toISOString(),
            updatedAt: item.updatedAt.toISOString(),
          })),
        },
      });
    } catch (error) {
      fastify.log.error({ requestId, error }, 'Error creating sprint');
      
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
        detail: 'An unexpected error occurred while creating the sprint',
        requestId,
      });
    }
  });

  // Get Sprint by ID
  fastify.get('/sprints/:id', async (request, reply) => {
    const requestId = request.headers['x-request-id'] as string;
    const { id } = request.params as { id: string };

    try {
      const sprint = await db.sprint.findUnique({
        where: { id },
        include: {
          project: {
            select: {
              id: true,
              name: true,
            },
          },
          items: {
            orderBy: {
              order: 'asc',
            },
          },
        },
      });

      if (!sprint) {
        return reply.status(404).send({
          type: 'https://1plan.dev/errors/not-found',
          title: 'Sprint Not Found',
          status: 404,
          detail: `Sprint with ID ${id} not found`,
          requestId,
        });
      }

      reply.send({
        sprint: {
          id: sprint.id,
          projectId: sprint.projectId,
          code: sprint.code,
          name: sprint.name,
          status: sprint.status,
          startDate: sprint.startDate?.toISOString() || null,
          endDate: sprint.endDate?.toISOString() || null,
          createdAt: sprint.createdAt.toISOString(),
          updatedAt: sprint.updatedAt.toISOString(),
          project: sprint.project,
          items: sprint.items.map(item => ({
            id: item.id,
            text: item.text,
            checked: item.checked,
            order: item.order,
            createdAt: item.createdAt.toISOString(),
            updatedAt: item.updatedAt.toISOString(),
          })),
        },
      });
    } catch (error) {
      fastify.log.error({ requestId, sprintId: id, error }, 'Error retrieving sprint');
      
      return reply.status(500).send({
        type: 'https://1plan.dev/errors/internal-error',
        title: 'Internal Server Error',
        status: 500,
        detail: 'An unexpected error occurred while retrieving the sprint',
        requestId,
      });
    }
  });

  // List Sprints
  fastify.get('/sprints', async (request, reply) => {
    const requestId = request.headers['x-request-id'] as string;

    try {
      const query = ListSprintsQuerySchema.parse(request.query);
      
      // Build where clause
      const where: any = {};
      if (query.projectId) where.projectId = query.projectId;
      if (query.status) where.status = query.status;

      // Get total count
      const total = await db.sprint.count({ where });

      // Get sprints with pagination and item counts
      const sprints = await db.sprint.findMany({
        where,
        include: {
          project: {
            select: {
              id: true,
              name: true,
            },
          },
          items: {
            select: {
              checked: true,
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
        sprints: sprints.map(sprint => ({
          id: sprint.id,
          projectId: sprint.projectId,
          code: sprint.code,
          name: sprint.name,
          status: sprint.status,
          startDate: sprint.startDate?.toISOString() || null,
          endDate: sprint.endDate?.toISOString() || null,
          createdAt: sprint.createdAt.toISOString(),
          updatedAt: sprint.updatedAt.toISOString(),
          project: sprint.project,
          itemCount: sprint.items.length,
          completedItemCount: sprint.items.filter(item => item.checked).length,
        })),
        total,
        limit: query.limit,
        offset: query.offset,
      });
    } catch (error) {
      fastify.log.error({ requestId, error }, 'Error listing sprints');
      
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
        detail: 'An unexpected error occurred while listing sprints',
        requestId,
      });
    }
  });

  // Update Sprint
  fastify.patch('/sprints/:id', async (request, reply) => {
    const requestId = request.headers['x-request-id'] as string;
    const { id } = request.params as { id: string };

    try {
      const updates = UpdateSprintSchema.parse(request.body);

      // Check if sprint exists
      const existingSprint = await db.sprint.findUnique({
        where: { id },
        include: {
          items: true,
        },
      });

      if (!existingSprint) {
        return reply.status(404).send({
          type: 'https://1plan.dev/errors/not-found',
          title: 'Sprint Not Found',
          status: 404,
          detail: `Sprint with ID ${id} not found`,
          requestId,
        });
      }

      // If updating code, check for conflicts
      if (updates.code && updates.code !== existingSprint.code) {
        const conflictingSprint = await db.sprint.findUnique({
          where: {
            projectId_code: {
              projectId: existingSprint.projectId,
              code: updates.code,
            },
          },
        });

        if (conflictingSprint) {
          return reply.status(409).send({
            type: 'https://1plan.dev/errors/conflict',
            title: 'Sprint Code Conflict',
            status: 409,
            detail: `Sprint ${updates.code} already exists in this project`,
            requestId,
          });
        }
      }

      // Validate date logic
      const startDate = updates.startDate ? new Date(updates.startDate) : existingSprint.startDate;
      const endDate = updates.endDate ? new Date(updates.endDate) : existingSprint.endDate;
      
      if (startDate && endDate && endDate <= startDate) {
        return reply.status(422).send({
          type: 'https://1plan.dev/errors/validation-failed',
          title: 'Validation Failed',
          status: 422,
          detail: 'End date must be after start date',
          requestId,
        });
      }

      // Update sprint and items in a transaction
      const sprint = await db.$transaction(async (tx) => {
        // Update sprint
        const updatedSprint = await tx.sprint.update({
          where: { id },
          data: {
            ...(updates.code && { code: updates.code }),
            ...(updates.name && { name: updates.name }),
            ...(updates.status && { status: updates.status as SprintStatus }),
            ...(updates.startDate !== undefined && { startDate: updates.startDate ? new Date(updates.startDate) : null }),
            ...(updates.endDate !== undefined && { endDate: updates.endDate ? new Date(updates.endDate) : null }),
          },
        });

        // Update items if provided
        let items = existingSprint.items;
        if (updates.items) {
          // Delete existing items
          await tx.sprintItem.deleteMany({
            where: { sprintId: id },
          });

          // Create new items
          items = [];
          for (let i = 0; i < updates.items.length; i++) {
            const item = updates.items[i];
            const createdItem = await tx.sprintItem.create({
              data: {
                sprintId: id,
                text: item.text,
                checked: item.checked,
                order: item.order || i,
              },
            });
            items.push(createdItem);
          }
        }

        return { ...updatedSprint, items };
      });

      fastify.log.info({
        requestId,
        sprintId: sprint.id,
        projectId: sprint.projectId,
        sprintCode: sprint.code,
        itemCount: sprint.items.length,
      }, 'Sprint updated');

      reply.send({
        sprint: {
          id: sprint.id,
          projectId: sprint.projectId,
          code: sprint.code,
          name: sprint.name,
          status: sprint.status,
          startDate: sprint.startDate?.toISOString() || null,
          endDate: sprint.endDate?.toISOString() || null,
          createdAt: sprint.createdAt.toISOString(),
          updatedAt: sprint.updatedAt.toISOString(),
          items: sprint.items.map(item => ({
            id: item.id,
            text: item.text,
            checked: item.checked,
            order: item.order,
            createdAt: item.createdAt.toISOString(),
            updatedAt: item.updatedAt.toISOString(),
          })),
        },
      });
    } catch (error) {
      fastify.log.error({ requestId, sprintId: id, error }, 'Error updating sprint');
      
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
        detail: 'An unexpected error occurred while updating the sprint',
        requestId,
      });
    }
  });

  // Delete Sprint
  fastify.delete('/sprints/:id', async (request, reply) => {
    const requestId = request.headers['x-request-id'] as string;
    const { id } = request.params as { id: string };

    try {
      // Check if sprint exists
      const existingSprint = await db.sprint.findUnique({
        where: { id },
        include: {
          items: true,
        },
      });

      if (!existingSprint) {
        return reply.status(404).send({
          type: 'https://1plan.dev/errors/not-found',
          title: 'Sprint Not Found',
          status: 404,
          detail: `Sprint with ID ${id} not found`,
          requestId,
        });
      }

      // Delete sprint (items will cascade)
      await db.sprint.delete({
        where: { id },
      });

      fastify.log.info({
        requestId,
        sprintId: id,
        projectId: existingSprint.projectId,
        sprintCode: existingSprint.code,
        itemCount: existingSprint.items.length,
      }, 'Sprint deleted');

      reply.status(204).send({});
    } catch (error) {
      fastify.log.error({ requestId, sprintId: id, error }, 'Error deleting sprint');
      
      return reply.status(500).send({
        type: 'https://1plan.dev/errors/internal-error',
        title: 'Internal Server Error',
        status: 500,
        detail: 'An unexpected error occurred while deleting the sprint',
        requestId,
      });
    }
  });
}
