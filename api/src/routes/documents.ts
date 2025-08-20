import { FastifyInstance } from 'fastify';
import { db } from '../lib/db.js';
import { 
  createDocumentSchema,
  generateSlug,
  UpdateDocumentInput,
  DocumentParams,
  ListDocumentsQuery
} from '../types/document.js';
import { NotFoundError, ConflictError } from '../middleware/error-handler.js';

export async function documentRoutes(fastify: FastifyInstance) {
  // Create document
  fastify.post('/documents', async (request, reply) => {
    // Validate input
    const validation = createDocumentSchema.safeParse(request.body);
    if (!validation.success) {
      reply.status(400);
      return {
        error: 'Validation failed',
        details: validation.error.issues,
      };
    }
    
    const data = validation.data;
    
    // Generate slug if not provided
    const slug = data.slug || generateSlug(data.title);

    try {
      // Check if project exists
      const project = await db.project.findUnique({
        where: { id: data.projectId },
      });

      if (!project) {
        throw new NotFoundError('Project not found');
      }

      // Create document
      const document = await db.document.create({
        data: {
          ...data,
          slug,
        },
      });

      request.log.info({ documentId: document.id, projectId: data.projectId }, 'Document created');

      reply.status(201);
      return {
        ...document,
        createdAt: document.createdAt.toISOString(),
        updatedAt: document.updatedAt.toISOString(),
      };
    } catch (error: any) {
      if (error.code === 'P2002') {
        // Unique constraint violation - slug already exists for this project
        throw new ConflictError(`Document with slug '${slug}' already exists in this project`);
      }
      throw error;
    }
  });

  // Get document by ID
  fastify.get('/documents/:id', async (request) => {
    const { id } = request.params as DocumentParams;

    const document = await db.document.findUnique({
      where: { id },
    });

    if (!document) {
      throw new NotFoundError('Document not found');
    }

    request.log.debug({ documentId: id }, 'Document retrieved');

    return {
      ...document,
      createdAt: document.createdAt.toISOString(),
      updatedAt: document.updatedAt.toISOString(),
    };
  });

  // List documents
  fastify.get('/documents', async (request) => {
    const query = request.query as ListDocumentsQuery;
    
    const where = {
      ...(query.projectId && { projectId: query.projectId }),
      ...(query.kind && { kind: query.kind }),
    };

    const [documents, total] = await Promise.all([
      db.document.findMany({
        where,
        orderBy: { [query.sortBy]: query.sortOrder },
        take: query.limit,
        skip: query.offset,
      }),
      db.document.count({ where }),
    ]);

    request.log.debug({ 
      count: documents.length, 
      total, 
      projectId: query.projectId,
      kind: query.kind 
    }, 'Documents listed');

    return {
      documents: documents.map(doc => ({
        ...doc,
        createdAt: doc.createdAt.toISOString(),
        updatedAt: doc.updatedAt.toISOString(),
      })),
      total,
      limit: query.limit,
      offset: query.offset,
    };
  });

  // Update document
  fastify.patch('/documents/:id', async (request) => {
    const { id } = request.params as DocumentParams;
    const data = request.body as UpdateDocumentInput;

    // If title is being updated and no slug provided, generate new slug
    if (data.title && !data.slug) {
      data.slug = generateSlug(data.title);
    }

    try {
      const document = await db.document.update({
        where: { id },
        data,
      });

      request.log.info({ documentId: id }, 'Document updated');

      return {
        ...document,
        createdAt: document.createdAt.toISOString(),
        updatedAt: document.updatedAt.toISOString(),
      };
    } catch (error: any) {
      if (error.code === 'P2025') {
        throw new NotFoundError('Document not found');
      }
      if (error.code === 'P2002') {
        throw new ConflictError(`Document with slug '${data.slug}' already exists in this project`);
      }
      throw error;
    }
  });

  // Delete document
  fastify.delete('/documents/:id', async (request, reply) => {
    const { id } = request.params as DocumentParams;

    try {
      await db.document.delete({
        where: { id },
      });

      request.log.info({ documentId: id }, 'Document deleted');
      
      reply.status(204);
      return null;
    } catch (error: any) {
      if (error.code === 'P2025') {
        throw new NotFoundError('Document not found');
      }
      throw error;
    }
  });
}
