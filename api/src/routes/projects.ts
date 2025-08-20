import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { db } from '../lib/db.js';
import { NotFoundError } from '../middleware/error-handler.js';

// Project validation schemas
const createProjectSchema = z.object({
  name: z.string().min(1, 'Project name is required').max(100, 'Project name too long'),
});

const updateProjectSchema = z.object({
  name: z.string().min(1, 'Project name is required').max(100, 'Project name too long').optional(),
});

const projectParamsSchema = z.object({
  id: z.string().cuid('Invalid project ID format'),
});

export async function projectRoutes(fastify: FastifyInstance) {
  // Create project
  fastify.post('/projects', async (request, reply) => {
    // Validate input
    const validation = createProjectSchema.safeParse(request.body);
    if (!validation.success) {
      reply.status(400);
      return {
        error: 'Validation failed',
        details: validation.error.issues,
      };
    }
    
    const data = validation.data;
    
    const project = await db.project.create({
      data: {
        name: data.name,
      },
    });

    request.log.info({ projectId: project.id }, 'Project created');

    reply.status(201);
    return {
      ...project,
      createdAt: project.createdAt.toISOString(),
      updatedAt: project.updatedAt.toISOString(),
    };
  });

  // Get project by ID
  fastify.get('/projects/:id', async (request) => {
    const { id } = request.params as z.infer<typeof projectParamsSchema>;

    const project = await db.project.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            documents: true,
            features: true,
            sprints: true,
          },
        },
      },
    });

    if (!project) {
      throw new NotFoundError('Project not found');
    }

    request.log.debug({ projectId: id }, 'Project retrieved');

    return {
      ...project,
      createdAt: project.createdAt.toISOString(),
      updatedAt: project.updatedAt.toISOString(),
    };
  });

  // List projects
  fastify.get('/projects', async (request) => {
    const projects = await db.project.findMany({
      orderBy: { updatedAt: 'desc' },
      include: {
        _count: {
          select: {
            documents: true,
            features: true,
            sprints: true,
          },
        },
      },
    });

    request.log.debug({ count: projects.length }, 'Projects listed');

    return {
      projects: projects.map(project => ({
        ...project,
        createdAt: project.createdAt.toISOString(),
        updatedAt: project.updatedAt.toISOString(),
      })),
      total: projects.length,
    };
  });

  // Update project
  fastify.patch('/projects/:id', async (request) => {
    const { id } = request.params as z.infer<typeof projectParamsSchema>;
    const data = request.body as z.infer<typeof updateProjectSchema>;

    try {
      const project = await db.project.update({
        where: { id },
        data,
      });

      request.log.info({ projectId: id }, 'Project updated');

      return {
        ...project,
        createdAt: project.createdAt.toISOString(),
        updatedAt: project.updatedAt.toISOString(),
      };
    } catch (error: any) {
      if (error.code === 'P2025') {
        throw new NotFoundError('Project not found');
      }
      throw error;
    }
  });

  // Delete project
  fastify.delete('/projects/:id', async (request, reply) => {
    const { id } = request.params as z.infer<typeof projectParamsSchema>;

    try {
      await db.project.delete({
        where: { id },
      });

      request.log.info({ projectId: id }, 'Project deleted');
      
      reply.status(204);
      return null;
    } catch (error: any) {
      if (error.code === 'P2025') {
        throw new NotFoundError('Project not found');
      }
      throw error;
    }
  });
}
