import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';
import { apiClient } from '../lib/api-client.js';
import { logger } from '../lib/logger.js';
import {
  createProjectSchema,
  updateProjectSchema,
  idSchema,
  toolArgsSchema,
} from '../types/mcp-types.js';

// Tool: Create Project
export const createProjectTool: Tool = {
  name: 'create_project',
  description: 'Create a new project',
  inputSchema: {
    type: 'object',
    properties: {
      name: {
        type: 'string',
        description: 'The name of the project',
        minLength: 1,
        maxLength: 100,
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
    required: ['name'],
  },
};

export async function handleCreateProject(args: any): Promise<any> {
  try {
    const validatedArgs = createProjectSchema.merge(toolArgsSchema).parse(args);
    
    logger.info({ 
      name: validatedArgs.name,
      requestId: validatedArgs.requestId 
    }, 'Creating project');

    const response = await apiClient.createProject(
      { name: validatedArgs.name },
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
      project: response.data,
      message: `Project "${validatedArgs.name}" created successfully`,
    };
  } catch (error) {
    logger.error({ error, args }, 'Failed to create project');
    throw error;
  }
}

// Tool: Get Project
export const getProjectTool: Tool = {
  name: 'get_project',
  description: 'Retrieve a project by ID',
  inputSchema: {
    type: 'object',
    properties: {
      id: {
        type: 'string',
        description: 'The ID of the project to retrieve',
      },
      requestId: {
        type: 'string',
        description: 'Optional request ID for tracing',
      },
    },
    required: ['id'],
  },
};

export async function handleGetProject(args: any): Promise<any> {
  try {
    const validatedArgs = z.object({
      id: idSchema,
      requestId: z.string().optional(),
    }).parse(args);

    logger.debug({ projectId: validatedArgs.id }, 'Getting project');

    const response = await apiClient.getProject(validatedArgs.id, {
      requestId: validatedArgs.requestId,
    });

    if (response.error) {
      if (response.status === 404) {
        throw new Error(`Project not found: ${validatedArgs.id}`);
      }
      throw new Error(`API Error: ${response.error.detail} (${response.error.status})`);
    }

    return {
      success: true,
      project: response.data,
    };
  } catch (error) {
    logger.error({ error, args }, 'Failed to get project');
    throw error;
  }
}

// Tool: List Projects
export const listProjectsTool: Tool = {
  name: 'list_projects',
  description: 'List all projects',
  inputSchema: {
    type: 'object',
    properties: {
      requestId: {
        type: 'string',
        description: 'Optional request ID for tracing',
      },
    },
    required: [],
  },
};

export async function handleListProjects(args: any): Promise<any> {
  try {
    const validatedArgs = toolArgsSchema.parse(args);

    logger.debug({ requestId: validatedArgs.requestId }, 'Listing projects');

    const response = await apiClient.getProjects({
      requestId: validatedArgs.requestId,
    });

    if (response.error) {
      throw new Error(`API Error: ${response.error.detail} (${response.error.status})`);
    }

    return {
      success: true,
      projects: response.data?.projects || [],
      total: response.data?.total || 0,
    };
  } catch (error) {
    logger.error({ error, args }, 'Failed to list projects');
    throw error;
  }
}

// Tool: Update Project
export const updateProjectTool: Tool = {
  name: 'update_project',
  description: 'Update an existing project',
  inputSchema: {
    type: 'object',
    properties: {
      id: {
        type: 'string',
        description: 'The ID of the project to update',
      },
      name: {
        type: 'string',
        description: 'The new name of the project',
        minLength: 1,
        maxLength: 100,
      },
      requestId: {
        type: 'string',
        description: 'Optional request ID for tracing',
      },
    },
    required: ['id'],
  },
};

export async function handleUpdateProject(args: any): Promise<any> {
  try {
    const validatedArgs = z.object({
      id: idSchema,
    }).merge(updateProjectSchema).merge(toolArgsSchema).parse(args);

    logger.info({ 
      projectId: validatedArgs.id,
      updates: Object.keys(args).filter(k => k !== 'id' && k !== 'requestId'),
      requestId: validatedArgs.requestId 
    }, 'Updating project');

    const { id, requestId, ...updateData } = validatedArgs;

    const response = await apiClient.updateProject(id, updateData, {
      requestId,
    });

    if (response.error) {
      if (response.status === 404) {
        throw new Error(`Project not found: ${id}`);
      }
      throw new Error(`API Error: ${response.error.detail} (${response.error.status})`);
    }

    return {
      success: true,
      project: response.data,
      message: `Project updated successfully`,
    };
  } catch (error) {
    logger.error({ error, args }, 'Failed to update project');
    throw error;
  }
}

// Tool: Delete Project
export const deleteProjectTool: Tool = {
  name: 'delete_project',
  description: 'Delete a project by ID (WARNING: This will also delete all associated documents)',
  inputSchema: {
    type: 'object',
    properties: {
      id: {
        type: 'string',
        description: 'The ID of the project to delete',
      },
      requestId: {
        type: 'string',
        description: 'Optional request ID for tracing',
      },
    },
    required: ['id'],
  },
};

export async function handleDeleteProject(args: any): Promise<any> {
  try {
    const validatedArgs = z.object({
      id: idSchema,
      requestId: z.string().optional(),
    }).parse(args);

    logger.warn({ projectId: validatedArgs.id }, 'Deleting project (cascade delete)');

    const response = await apiClient.deleteProject(validatedArgs.id, {
      requestId: validatedArgs.requestId,
    });

    if (response.error) {
      if (response.status === 404) {
        throw new Error(`Project not found: ${validatedArgs.id}`);
      }
      throw new Error(`API Error: ${response.error.detail} (${response.error.status})`);
    }

    return {
      success: true,
      message: `Project and all associated documents deleted successfully`,
    };
  } catch (error) {
    logger.error({ error, args }, 'Failed to delete project');
    throw error;
  }
}

// Export all project tools
export const projectTools = [
  createProjectTool,
  getProjectTool,
  listProjectsTool,
  updateProjectTool,
  deleteProjectTool,
];

export const projectHandlers = {
  create_project: handleCreateProject,
  get_project: handleGetProject,
  list_projects: handleListProjects,
  update_project: handleUpdateProject,
  delete_project: handleDeleteProject,
};
