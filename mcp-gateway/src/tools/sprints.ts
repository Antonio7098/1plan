import { z } from 'zod';
import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { apiClient } from '../lib/api-client.js';
import { logger } from '../lib/logger.js';

// Common args schema for request ID
const toolArgsSchema = z.object({
  requestId: z.string().optional(),
});

// Sprint item schema
const sprintItemSchema = z.object({
  text: z.string().min(1).max(500),
  checked: z.boolean().default(false),
  order: z.number().int().min(0).default(0),
});

// Sprint schemas
const createSprintSchema = z.object({
  projectId: z.string(),
  code: z.string().regex(/^SPR-\d+$/),
  name: z.string().min(1).max(200),
  status: z.enum(['PLANNED', 'ACTIVE', 'DONE', 'CANCELLED']).optional().default('PLANNED'),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  items: z.array(sprintItemSchema).optional().default([]),
  idempotencyKey: z.string().optional(),
});

const getSprintSchema = z.object({
  id: z.string(),
});

const listSprintsSchema = z.object({
  projectId: z.string().optional(),
  status: z.enum(['PLANNED', 'ACTIVE', 'DONE', 'CANCELLED']).optional(),
  limit: z.number().min(1).max(100).default(20),
  offset: z.number().min(0).default(0),
  sortBy: z.enum(['createdAt', 'updatedAt', 'name', 'code', 'startDate']).default('updatedAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

const updateSprintSchema = z.object({
  id: z.string(),
  code: z.string().regex(/^SPR-\d+$/).optional(),
  name: z.string().min(1).max(200).optional(),
  status: z.enum(['PLANNED', 'ACTIVE', 'DONE', 'CANCELLED']).optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  items: z.array(sprintItemSchema).optional(),
});

const deleteSprintSchema = z.object({
  id: z.string(),
});

// Tools
export const createSprintTool: Tool = {
  name: 'create_sprint',
  description: 'Create a new sprint in a project',
  inputSchema: {
    type: 'object',
    properties: {
      projectId: { type: 'string', description: 'The ID of the project to create the sprint in' },
      code: { type: 'string', pattern: '^SPR-\\d+$', description: 'Sprint code in format SPR-XXX' },
      name: { type: 'string', minLength: 1, maxLength: 200, description: 'The name of the sprint' },
      status: { type: 'string', enum: ['PLANNED', 'ACTIVE', 'DONE', 'CANCELLED'], default: 'PLANNED', description: 'Status of the sprint' },
      startDate: { type: 'string', format: 'date-time', description: 'Start date of the sprint (ISO 8601)' },
      endDate: { type: 'string', format: 'date-time', description: 'End date of the sprint (ISO 8601)' },
      items: {
        type: 'array',
        description: 'Sprint items/tasks',
        items: {
          type: 'object',
          properties: {
            text: { type: 'string', minLength: 1, maxLength: 500, description: 'Text content of the sprint item' },
            checked: { type: 'boolean', default: false, description: 'Whether the item is completed' },
            order: { type: 'number', minimum: 0, default: 0, description: 'Order of the item in the sprint' },
          },
          required: ['text'],
        },
      },
      requestId: { type: 'string', description: 'Optional request ID for tracing' },
      idempotencyKey: { type: 'string', description: 'Optional idempotency key for preventing duplicate creation' },
    },
    required: ['projectId', 'code', 'name'],
  },
};

export const getSprintTool: Tool = {
  name: 'get_sprint',
  description: 'Retrieve a sprint by ID',
  inputSchema: {
    type: 'object',
    properties: {
      id: { type: 'string', description: 'The ID of the sprint to retrieve' },
      requestId: { type: 'string', description: 'Optional request ID for tracing' },
    },
    required: ['id'],
  },
};

export const listSprintsTool: Tool = {
  name: 'list_sprints',
  description: 'List sprints with optional filtering and pagination',
  inputSchema: {
    type: 'object',
    properties: {
      projectId: { type: 'string', description: 'Filter by project ID' },
      status: { type: 'string', enum: ['PLANNED', 'ACTIVE', 'DONE', 'CANCELLED'], description: 'Filter by sprint status' },
      limit: { type: 'number', minimum: 1, maximum: 100, default: 20, description: 'Maximum number of sprints to return' },
      offset: { type: 'number', minimum: 0, default: 0, description: 'Number of sprints to skip' },
      sortBy: { type: 'string', enum: ['createdAt', 'updatedAt', 'name', 'code', 'startDate'], default: 'updatedAt', description: 'Field to sort by' },
      sortOrder: { type: 'string', enum: ['asc', 'desc'], default: 'desc', description: 'Sort order' },
      requestId: { type: 'string', description: 'Optional request ID for tracing' },
    },
    required: [],
  },
};

export const updateSprintTool: Tool = {
  name: 'update_sprint',
  description: 'Update an existing sprint',
  inputSchema: {
    type: 'object',
    properties: {
      id: { type: 'string', description: 'The ID of the sprint to update' },
      code: { type: 'string', pattern: '^SPR-\\d+$', description: 'Sprint code in format SPR-XXX' },
      name: { type: 'string', minLength: 1, maxLength: 200, description: 'The name of the sprint' },
      status: { type: 'string', enum: ['PLANNED', 'ACTIVE', 'DONE', 'CANCELLED'], description: 'Status of the sprint' },
      startDate: { type: 'string', format: 'date-time', description: 'Start date of the sprint (ISO 8601)' },
      endDate: { type: 'string', format: 'date-time', description: 'End date of the sprint (ISO 8601)' },
      items: {
        type: 'array',
        description: 'Sprint items/tasks',
        items: {
          type: 'object',
          properties: {
            text: { type: 'string', minLength: 1, maxLength: 500, description: 'Text content of the sprint item' },
            checked: { type: 'boolean', default: false, description: 'Whether the item is completed' },
            order: { type: 'number', minimum: 0, default: 0, description: 'Order of the item in the sprint' },
          },
          required: ['text'],
        },
      },
      requestId: { type: 'string', description: 'Optional request ID for tracing' },
    },
    required: ['id'],
  },
};

export const deleteSprintTool: Tool = {
  name: 'delete_sprint',
  description: 'Delete a sprint by ID (WARNING: This will also delete all sprint items)',
  inputSchema: {
    type: 'object',
    properties: {
      id: { type: 'string', description: 'The ID of the sprint to delete' },
      requestId: { type: 'string', description: 'Optional request ID for tracing' },
    },
    required: ['id'],
  },
};

// Handlers
export async function handleCreateSprint(args: any): Promise<any> {
  try {
    const validatedArgs = createSprintSchema.merge(toolArgsSchema).parse(args);
    
    logger.info({ 
      sprintCode: validatedArgs.code, 
      projectId: validatedArgs.projectId,
      itemCount: validatedArgs.items?.length || 0 
    }, 'Creating sprint');
    
    const response = await apiClient.createSprint(validatedArgs, { requestId: validatedArgs.requestId });
    
    if (response.error) {
      logger.error({ error: response.error }, 'Create sprint failed');
      throw new Error(`Create sprint failed: ${response.error.title} - ${response.error.detail}`);
    }
    
    return {
      content: [
        {
          type: 'text' as const,
          text: JSON.stringify({ success: true, sprint: response.data.sprint }, null, 2),
        },
      ],
    };
  } catch (error) {
    logger.error({ error, args }, 'Failed to create sprint');
    throw error;
  }
}

export async function handleGetSprint(args: any): Promise<any> {
  try {
    const validatedArgs = getSprintSchema.merge(toolArgsSchema).parse(args);
    
    logger.info({ sprintId: validatedArgs.id }, 'Getting sprint');
    
    const response = await apiClient.getSprint(validatedArgs.id, { requestId: validatedArgs.requestId });
    
    if (response.error) {
      logger.error({ error: response.error }, 'Get sprint failed');
      throw new Error(`Get sprint failed: ${response.error.title} - ${response.error.detail}`);
    }
    
    return {
      content: [
        {
          type: 'text' as const,
          text: JSON.stringify({ success: true, sprint: response.data.sprint }, null, 2),
        },
      ],
    };
  } catch (error) {
    logger.error({ error, args }, 'Failed to get sprint');
    throw error;
  }
}

export async function handleListSprints(args: any): Promise<any> {
  try {
    const validatedArgs = listSprintsSchema.merge(toolArgsSchema).parse(args);
    
    logger.info({ 
      projectId: validatedArgs.projectId,
      status: validatedArgs.status,
      limit: validatedArgs.limit 
    }, 'Listing sprints');
    
    const response = await apiClient.listSprints(validatedArgs, { requestId: validatedArgs.requestId });
    
    if (response.error) {
      logger.error({ error: response.error }, 'List sprints failed');
      throw new Error(`List sprints failed: ${response.error.title} - ${response.error.detail}`);
    }
    
    return {
      content: [
        {
          type: 'text' as const,
          text: JSON.stringify({
            success: true,
            sprints: response.data.sprints,
            total: response.data.total,
            limit: response.data.limit,
            offset: response.data.offset,
          }, null, 2),
        },
      ],
    };
  } catch (error) {
    logger.error({ error, args }, 'Failed to list sprints');
    throw error;
  }
}

export async function handleUpdateSprint(args: any): Promise<any> {
  try {
    const validatedArgs = updateSprintSchema.merge(toolArgsSchema).parse(args);
    
    logger.info({ 
      sprintId: validatedArgs.id,
      itemCount: validatedArgs.items?.length 
    }, 'Updating sprint');
    
    const response = await apiClient.updateSprint(validatedArgs.id, validatedArgs, { requestId: validatedArgs.requestId });
    
    if (response.error) {
      logger.error({ error: response.error }, 'Update sprint failed');
      throw new Error(`Update sprint failed: ${response.error.title} - ${response.error.detail}`);
    }
    
    return {
      content: [
        {
          type: 'text' as const,
          text: JSON.stringify({ success: true, sprint: response.data.sprint }, null, 2),
        },
      ],
    };
  } catch (error) {
    logger.error({ error, args }, 'Failed to update sprint');
    throw error;
  }
}

export async function handleDeleteSprint(args: any): Promise<any> {
  try {
    const validatedArgs = deleteSprintSchema.merge(toolArgsSchema).parse(args);
    
    logger.info({ sprintId: validatedArgs.id }, 'Deleting sprint');
    
    const response = await apiClient.deleteSprint(validatedArgs.id, { requestId: validatedArgs.requestId });
    
    if (response.error) {
      logger.error({ error: response.error }, 'Delete sprint failed');
      throw new Error(`Delete sprint failed: ${response.error.title} - ${response.error.detail}`);
    }
    
    return {
      content: [
        {
          type: 'text' as const,
          text: JSON.stringify({ success: true, message: 'Sprint deleted successfully' }, null, 2),
        },
      ],
    };
  } catch (error) {
    logger.error({ error, args }, 'Failed to delete sprint');
    throw error;
  }
}

// Export all sprint tools
export const sprintTools = [
  createSprintTool,
  getSprintTool,
  listSprintsTool,
  updateSprintTool,
  deleteSprintTool,
];

export const sprintHandlers = {
  create_sprint: handleCreateSprint,
  get_sprint: handleGetSprint,
  list_sprints: handleListSprints,
  update_sprint: handleUpdateSprint,
  delete_sprint: handleDeleteSprint,
};