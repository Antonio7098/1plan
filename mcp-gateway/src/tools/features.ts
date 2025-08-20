import { z } from 'zod';
import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { apiClient } from '../lib/api-client.js';
import { logger } from '../lib/logger.js';

// Common args schema for request ID
const toolArgsSchema = z.object({
  requestId: z.string().optional(),
});

// Feature schemas
const createFeatureSchema = z.object({
  projectId: z.string(),
  featureId: z.string().regex(/^FEAT-\d+$/),
  title: z.string().min(1).max(200),
  version: z.string().optional().default('0.1.0'),
  status: z.enum(['PLANNED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED']).optional().default('PLANNED'),
  area: z.string().min(1).max(100),
  idempotencyKey: z.string().optional(),
});

const getFeatureSchema = z.object({
  id: z.string(),
});

const listFeaturesSchema = z.object({
  projectId: z.string().optional(),
  status: z.enum(['PLANNED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED']).optional(),
  area: z.string().optional(),
  limit: z.number().min(1).max(100).default(20),
  offset: z.number().min(0).default(0),
  sortBy: z.enum(['createdAt', 'updatedAt', 'title', 'featureId']).default('updatedAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

const updateFeatureSchema = z.object({
  id: z.string(),
  featureId: z.string().regex(/^FEAT-\d+$/).optional(),
  title: z.string().min(1).max(200).optional(),
  version: z.string().optional(),
  status: z.enum(['PLANNED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED']).optional(),
  area: z.string().min(1).max(100).optional(),
});

const deleteFeatureSchema = z.object({
  id: z.string(),
});

// Tools
export const createFeatureTool: Tool = {
  name: 'create_feature',
  description: 'Create a new feature in a project',
  inputSchema: {
    type: 'object',
    properties: {
      projectId: { type: 'string', description: 'The ID of the project to create the feature in' },
      featureId: { type: 'string', pattern: '^FEAT-\\d+$', description: 'Feature ID in format FEAT-XXX' },
      title: { type: 'string', minLength: 1, maxLength: 200, description: 'The title of the feature' },
      version: { type: 'string', default: '0.1.0', description: 'Version of the feature' },
      status: { type: 'string', enum: ['PLANNED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'], default: 'PLANNED', description: 'Status of the feature' },
      area: { type: 'string', minLength: 1, maxLength: 100, description: 'Area or domain of the feature' },
      requestId: { type: 'string', description: 'Optional request ID for tracing' },
      idempotencyKey: { type: 'string', description: 'Optional idempotency key for preventing duplicate creation' },
    },
    required: ['projectId', 'featureId', 'title', 'area'],
  },
};

export const getFeatureTool: Tool = {
  name: 'get_feature',
  description: 'Retrieve a feature by ID',
  inputSchema: {
    type: 'object',
    properties: {
      id: { type: 'string', description: 'The ID of the feature to retrieve' },
      requestId: { type: 'string', description: 'Optional request ID for tracing' },
    },
    required: ['id'],
  },
};

export const listFeaturesTool: Tool = {
  name: 'list_features',
  description: 'List features with optional filtering and pagination',
  inputSchema: {
    type: 'object',
    properties: {
      projectId: { type: 'string', description: 'Filter by project ID' },
      status: { type: 'string', enum: ['PLANNED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'], description: 'Filter by feature status' },
      area: { type: 'string', description: 'Filter by area' },
      limit: { type: 'number', minimum: 1, maximum: 100, default: 20, description: 'Maximum number of features to return' },
      offset: { type: 'number', minimum: 0, default: 0, description: 'Number of features to skip' },
      sortBy: { type: 'string', enum: ['createdAt', 'updatedAt', 'title', 'featureId'], default: 'updatedAt', description: 'Field to sort by' },
      sortOrder: { type: 'string', enum: ['asc', 'desc'], default: 'desc', description: 'Sort order' },
      requestId: { type: 'string', description: 'Optional request ID for tracing' },
    },
    required: [],
  },
};

export const updateFeatureTool: Tool = {
  name: 'update_feature',
  description: 'Update an existing feature',
  inputSchema: {
    type: 'object',
    properties: {
      id: { type: 'string', description: 'The ID of the feature to update' },
      featureId: { type: 'string', pattern: '^FEAT-\\d+$', description: 'Feature ID in format FEAT-XXX' },
      title: { type: 'string', minLength: 1, maxLength: 200, description: 'The title of the feature' },
      version: { type: 'string', description: 'Version of the feature' },
      status: { type: 'string', enum: ['PLANNED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'], description: 'Status of the feature' },
      area: { type: 'string', minLength: 1, maxLength: 100, description: 'Area or domain of the feature' },
      requestId: { type: 'string', description: 'Optional request ID for tracing' },
    },
    required: ['id'],
  },
};

export const deleteFeatureTool: Tool = {
  name: 'delete_feature',
  description: 'Delete a feature by ID',
  inputSchema: {
    type: 'object',
    properties: {
      id: { type: 'string', description: 'The ID of the feature to delete' },
      requestId: { type: 'string', description: 'Optional request ID for tracing' },
    },
    required: ['id'],
  },
};

// Handlers
export async function handleCreateFeature(args: any): Promise<any> {
  try {
    const validatedArgs = createFeatureSchema.merge(toolArgsSchema).parse(args);
    
    logger.info({ featureId: validatedArgs.featureId, projectId: validatedArgs.projectId }, 'Creating feature');
    
    const response = await apiClient.createFeature(validatedArgs, { requestId: validatedArgs.requestId });
    
    if (response.error) {
      logger.error({ error: response.error }, 'Create feature failed');
      throw new Error(`Create feature failed: ${response.error.title} - ${response.error.detail}`);
    }
    
    return {
      content: [
        {
          type: 'text' as const,
          text: JSON.stringify({ success: true, feature: response.data.feature }, null, 2),
        },
      ],
    };
  } catch (error) {
    logger.error({ error, args }, 'Failed to create feature');
    throw error;
  }
}

export async function handleGetFeature(args: any): Promise<any> {
  try {
    const validatedArgs = getFeatureSchema.merge(toolArgsSchema).parse(args);
    
    logger.info({ featureId: validatedArgs.id }, 'Getting feature');
    
    const response = await apiClient.getFeature(validatedArgs.id, { requestId: validatedArgs.requestId });
    
    if (response.error) {
      logger.error({ error: response.error }, 'Get feature failed');
      throw new Error(`Get feature failed: ${response.error.title} - ${response.error.detail}`);
    }
    
    return {
      content: [
        {
          type: 'text' as const,
          text: JSON.stringify({ success: true, feature: response.data.feature }, null, 2),
        },
      ],
    };
  } catch (error) {
    logger.error({ error, args }, 'Failed to get feature');
    throw error;
  }
}

export async function handleListFeatures(args: any): Promise<any> {
  try {
    const validatedArgs = listFeaturesSchema.merge(toolArgsSchema).parse(args);
    
    logger.info({ 
      projectId: validatedArgs.projectId,
      status: validatedArgs.status,
      limit: validatedArgs.limit 
    }, 'Listing features');
    
    const response = await apiClient.listFeatures(validatedArgs, { requestId: validatedArgs.requestId });
    
    if (response.error) {
      logger.error({ error: response.error }, 'List features failed');
      throw new Error(`List features failed: ${response.error.title} - ${response.error.detail}`);
    }
    
    return {
      content: [
        {
          type: 'text' as const,
          text: JSON.stringify({
            success: true,
            features: response.data.features,
            total: response.data.total,
            limit: response.data.limit,
            offset: response.data.offset,
          }, null, 2),
        },
      ],
    };
  } catch (error) {
    logger.error({ error, args }, 'Failed to list features');
    throw error;
  }
}

export async function handleUpdateFeature(args: any): Promise<any> {
  try {
    const validatedArgs = updateFeatureSchema.merge(toolArgsSchema).parse(args);
    
    logger.info({ featureId: validatedArgs.id }, 'Updating feature');
    
    const response = await apiClient.updateFeature(validatedArgs.id, validatedArgs, { requestId: validatedArgs.requestId });
    
    if (response.error) {
      logger.error({ error: response.error }, 'Update feature failed');
      throw new Error(`Update feature failed: ${response.error.title} - ${response.error.detail}`);
    }
    
    return {
      content: [
        {
          type: 'text' as const,
          text: JSON.stringify({ success: true, feature: response.data.feature }, null, 2),
        },
      ],
    };
  } catch (error) {
    logger.error({ error, args }, 'Failed to update feature');
    throw error;
  }
}

export async function handleDeleteFeature(args: any): Promise<any> {
  try {
    const validatedArgs = deleteFeatureSchema.merge(toolArgsSchema).parse(args);
    
    logger.info({ featureId: validatedArgs.id }, 'Deleting feature');
    
    const response = await apiClient.deleteFeature(validatedArgs.id, { requestId: validatedArgs.requestId });
    
    if (response.error) {
      logger.error({ error: response.error }, 'Delete feature failed');
      throw new Error(`Delete feature failed: ${response.error.title} - ${response.error.detail}`);
    }
    
    return {
      content: [
        {
          type: 'text' as const,
          text: JSON.stringify({ success: true, message: 'Feature deleted successfully' }, null, 2),
        },
      ],
    };
  } catch (error) {
    logger.error({ error, args }, 'Failed to delete feature');
    throw error;
  }
}

// Export all feature tools
export const featureTools = [
  createFeatureTool,
  getFeatureTool,
  listFeaturesTool,
  updateFeatureTool,
  deleteFeatureTool,
];

export const featureHandlers = {
  create_feature: handleCreateFeature,
  get_feature: handleGetFeature,
  list_features: handleListFeatures,
  update_feature: handleUpdateFeature,
  delete_feature: handleDeleteFeature,
};