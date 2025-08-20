import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';
import { apiClient } from '../lib/api-client.js';
import { logger } from '../lib/logger.js';
import {
  createDocumentSchema,
  updateDocumentSchema,
  listDocumentsSchema,
  idSchema,
  toolArgsSchema,
} from '../types/mcp-types.js';

// Tool: Create Document
export const createDocumentTool: Tool = {
  name: 'create_document',
  description: 'Create a new document in a project',
  inputSchema: {
    type: 'object',
    properties: {
      projectId: {
        type: 'string',
        description: 'The ID of the project to create the document in',
      },
      kind: {
        type: 'string',
        enum: ['PRD', 'TECH_OVERVIEW', 'SPRINT_OVERVIEW', 'SPRINT', 'FREEFORM'],
        description: 'The type of document to create',
      },
      title: {
        type: 'string',
        description: 'The title of the document',
      },
      content: {
        type: 'string',
        description: 'The content of the document (supports Markdown)',
      },
      slug: {
        type: 'string',
        description: 'Optional URL-friendly slug (auto-generated if not provided)',
        pattern: '^[a-z0-9-]+$',
      },
      requestId: {
        type: 'string',
        description: 'Optional request ID for tracing',
      },
      idempotencyKey: {
        type: 'string',
        description: 'Optional idempotency key for preventing duplicate creation',
      },
    },
    required: ['projectId', 'kind', 'title', 'content'],
  },
};

export async function handleCreateDocument(args: any): Promise<any> {
  try {
    // Validate arguments
    const validatedArgs = createDocumentSchema.merge(toolArgsSchema).parse(args);
    
    logger.info({ 
      projectId: validatedArgs.projectId, 
      kind: validatedArgs.kind, 
      title: validatedArgs.title,
      requestId: validatedArgs.requestId 
    }, 'Creating document');

    const response = await apiClient.createDocument(
      {
        projectId: validatedArgs.projectId,
        kind: validatedArgs.kind,
        title: validatedArgs.title,
        content: validatedArgs.content,
        slug: validatedArgs.slug,
      },
      {
        requestId: validatedArgs.requestId,
        idempotencyKey: validatedArgs.idempotencyKey,
      }
    );

    if (response.error) {
      throw new Error(`API Error: ${response.error.detail} (${response.error.status})`);
    }

    return {
      success: true,
      document: response.data,
      message: `Document "${validatedArgs.title}" created successfully`,
    };
  } catch (error) {
    logger.error({ error, args }, 'Failed to create document');
    throw error;
  }
}

// Tool: Get Document
export const getDocumentTool: Tool = {
  name: 'get_document',
  description: 'Retrieve a document by ID',
  inputSchema: {
    type: 'object',
    properties: {
      id: {
        type: 'string',
        description: 'The ID of the document to retrieve',
      },
      requestId: {
        type: 'string',
        description: 'Optional request ID for tracing',
      },
    },
    required: ['id'],
  },
};

export async function handleGetDocument(args: any): Promise<any> {
  try {
    const validatedArgs = z.object({
      id: idSchema,
      requestId: z.string().optional(),
    }).parse(args);

    logger.debug({ documentId: validatedArgs.id }, 'Getting document');

    const response = await apiClient.getDocument(validatedArgs.id, {
      requestId: validatedArgs.requestId,
    });

    if (response.error) {
      if (response.status === 404) {
        throw new Error(`Document not found: ${validatedArgs.id}`);
      }
      throw new Error(`API Error: ${response.error.detail} (${response.error.status})`);
    }

    return {
      success: true,
      document: response.data,
    };
  } catch (error) {
    logger.error({ error, args }, 'Failed to get document');
    throw error;
  }
}

// Tool: List Documents
export const listDocumentsTool: Tool = {
  name: 'list_documents',
  description: 'List documents with optional filtering and pagination',
  inputSchema: {
    type: 'object',
    properties: {
      projectId: {
        type: 'string',
        description: 'Filter by project ID',
      },
      kind: {
        type: 'string',
        enum: ['PRD', 'TECH_OVERVIEW', 'SPRINT_OVERVIEW', 'SPRINT', 'FREEFORM'],
        description: 'Filter by document kind',
      },
      limit: {
        type: 'number',
        minimum: 1,
        maximum: 100,
        default: 20,
        description: 'Maximum number of documents to return',
      },
      offset: {
        type: 'number',
        minimum: 0,
        default: 0,
        description: 'Number of documents to skip',
      },
      sortBy: {
        type: 'string',
        enum: ['createdAt', 'updatedAt', 'title'],
        default: 'updatedAt',
        description: 'Field to sort by',
      },
      sortOrder: {
        type: 'string',
        enum: ['asc', 'desc'],
        default: 'desc',
        description: 'Sort order',
      },
      requestId: {
        type: 'string',
        description: 'Optional request ID for tracing',
      },
    },
    required: [],
  },
};

export async function handleListDocuments(args: any): Promise<any> {
  try {
    const validatedArgs = listDocumentsSchema.merge(toolArgsSchema).parse(args);

    logger.debug({ 
      projectId: validatedArgs.projectId, 
      kind: validatedArgs.kind, 
      limit: validatedArgs.limit,
      offset: validatedArgs.offset 
    }, 'Listing documents');

    const response = await apiClient.getDocuments(
      {
        projectId: validatedArgs.projectId,
        kind: validatedArgs.kind,
        limit: validatedArgs.limit,
        offset: validatedArgs.offset,
        sortBy: validatedArgs.sortBy,
        sortOrder: validatedArgs.sortOrder,
      },
      {
        requestId: validatedArgs.requestId,
      }
    );

    if (response.error) {
      throw new Error(`API Error: ${response.error.detail} (${response.error.status})`);
    }

    return {
      success: true,
      documents: response.data?.documents || [],
      total: response.data?.total || 0,
      pagination: {
        limit: validatedArgs.limit,
        offset: validatedArgs.offset,
        hasMore: (response.data?.total || 0) > (validatedArgs.offset + validatedArgs.limit),
      },
    };
  } catch (error) {
    logger.error({ error, args }, 'Failed to list documents');
    throw error;
  }
}

// Tool: Update Document
export const updateDocumentTool: Tool = {
  name: 'update_document',
  description: 'Update an existing document',
  inputSchema: {
    type: 'object',
    properties: {
      id: {
        type: 'string',
        description: 'The ID of the document to update',
      },
      kind: {
        type: 'string',
        enum: ['PRD', 'TECH_OVERVIEW', 'SPRINT_OVERVIEW', 'SPRINT', 'FREEFORM'],
        description: 'The type of document',
      },
      title: {
        type: 'string',
        description: 'The title of the document',
      },
      content: {
        type: 'string',
        description: 'The content of the document (supports Markdown)',
      },
      slug: {
        type: 'string',
        description: 'URL-friendly slug',
        pattern: '^[a-z0-9-]+$',
      },
      requestId: {
        type: 'string',
        description: 'Optional request ID for tracing',
      },
    },
    required: ['id'],
  },
};

export async function handleUpdateDocument(args: any): Promise<any> {
  try {
    const validatedArgs = z.object({
      id: idSchema,
    }).merge(updateDocumentSchema).merge(toolArgsSchema).parse(args);

    logger.info({ 
      documentId: validatedArgs.id,
      updates: Object.keys(args).filter(k => k !== 'id' && k !== 'requestId'),
      requestId: validatedArgs.requestId 
    }, 'Updating document');

    const { id, requestId, ...updateData } = validatedArgs;

    const response = await apiClient.updateDocument(id, updateData, {
      requestId,
    });

    if (response.error) {
      if (response.status === 404) {
        throw new Error(`Document not found: ${id}`);
      }
      throw new Error(`API Error: ${response.error.detail} (${response.error.status})`);
    }

    return {
      success: true,
      document: response.data,
      message: `Document updated successfully`,
    };
  } catch (error) {
    logger.error({ error, args }, 'Failed to update document');
    throw error;
  }
}

// Tool: Delete Document
export const deleteDocumentTool: Tool = {
  name: 'delete_document',
  description: 'Delete a document by ID',
  inputSchema: {
    type: 'object',
    properties: {
      id: {
        type: 'string',
        description: 'The ID of the document to delete',
      },
      requestId: {
        type: 'string',
        description: 'Optional request ID for tracing',
      },
    },
    required: ['id'],
  },
};

export async function handleDeleteDocument(args: any): Promise<any> {
  try {
    const validatedArgs = z.object({
      id: idSchema,
      requestId: z.string().optional(),
    }).parse(args);

    logger.info({ documentId: validatedArgs.id }, 'Deleting document');

    const response = await apiClient.deleteDocument(validatedArgs.id, {
      requestId: validatedArgs.requestId,
    });

    if (response.error) {
      if (response.status === 404) {
        throw new Error(`Document not found: ${validatedArgs.id}`);
      }
      throw new Error(`API Error: ${response.error.detail} (${response.error.status})`);
    }

    return {
      success: true,
      message: `Document deleted successfully`,
    };
  } catch (error) {
    logger.error({ error, args }, 'Failed to delete document');
    throw error;
  }
}

// Export all document tools
export const documentTools = [
  createDocumentTool,
  getDocumentTool,
  listDocumentsTool,
  updateDocumentTool,
  deleteDocumentTool,
];

export const documentHandlers = {
  create_document: handleCreateDocument,
  get_document: handleGetDocument,
  list_documents: handleListDocuments,
  update_document: handleUpdateDocument,
  delete_document: handleDeleteDocument,
};
