import { Resource } from '@modelcontextprotocol/sdk/types.js';
import { apiClient } from '../lib/api-client.js';
import { logger } from '../lib/logger.js';

// Resource: Projects List
export const projectsResource: Resource = {
  uri: '1plan://projects',
  name: 'Projects List',
  description: 'Read-only list of all projects in the system',
  mimeType: 'application/json',
};

export async function getProjectsResource(): Promise<any> {
  try {
    logger.debug('Fetching projects resource');
    
    const response = await apiClient.getProjects();
    
    if (response.error) {
      throw new Error(`Failed to fetch projects: ${response.error.detail}`);
    }

    return {
      contents: [
        {
          type: 'text',
          text: JSON.stringify({
            projects: response.data?.projects || [],
            total: response.data?.total || 0,
            lastUpdated: new Date().toISOString(),
          }, null, 2),
        },
      ],
    };
  } catch (error) {
    logger.error({ error }, 'Failed to get projects resource');
    throw error;
  }
}

// Resource: Document Types
export const documentTypesResource: Resource = {
  uri: '1plan://document-types',
  name: 'Document Types',
  description: 'Available document types/kinds in the system',
  mimeType: 'application/json',
};

export async function getDocumentTypesResource(): Promise<any> {
  return {
    contents: [
      {
        type: 'text',
        text: JSON.stringify({
          documentTypes: [
            {
              kind: 'PRD',
              name: 'Product Requirements Document',
              description: 'Defines product features, requirements, and specifications',
            },
            {
              kind: 'TECH_OVERVIEW',
              name: 'Technical Overview',
              description: 'High-level technical architecture and implementation details',
            },
            {
              kind: 'SPRINT_OVERVIEW',
              name: 'Sprint Overview',
              description: 'Overview of all sprints in the project',
            },
            {
              kind: 'SPRINT',
              name: 'Sprint Document',
              description: 'Detailed sprint planning and execution document',
            },
            {
              kind: 'FREEFORM',
              name: 'Freeform Document',
              description: 'General-purpose document for any content',
            },
          ],
          lastUpdated: new Date().toISOString(),
        }, null, 2),
      },
    ],
  };
}

// Resource: Recent Documents
export const recentDocumentsResource: Resource = {
  uri: '1plan://recent-documents',
  name: 'Recent Documents',
  description: 'Recently updated documents across all projects',
  mimeType: 'application/json',
};

export async function getRecentDocumentsResource(): Promise<any> {
  try {
    logger.debug('Fetching recent documents resource');
    
    const response = await apiClient.getDocuments({
      limit: 10,
      sortBy: 'updatedAt',
      sortOrder: 'desc',
    });
    
    if (response.error) {
      throw new Error(`Failed to fetch recent documents: ${response.error.detail}`);
    }

    return {
      contents: [
        {
          type: 'text',
          text: JSON.stringify({
            recentDocuments: response.data?.documents || [],
            total: response.data?.total || 0,
            lastUpdated: new Date().toISOString(),
          }, null, 2),
        },
      ],
    };
  } catch (error) {
    logger.error({ error }, 'Failed to get recent documents resource');
    throw error;
  }
}

// Resource: API Health
export const apiHealthResource: Resource = {
  uri: '1plan://api-health',
  name: 'API Health Status',
  description: 'Current health status of the 1Plan API',
  mimeType: 'application/json',
};

export async function getApiHealthResource(): Promise<any> {
  try {
    logger.debug('Fetching API health resource');
    
    const response = await apiClient.healthCheck();
    
    return {
      contents: [
        {
          type: 'text',
          text: JSON.stringify({
            apiHealth: response.data || { status: 'unknown', error: response.error },
            gatewayStatus: 'healthy',
            lastChecked: new Date().toISOString(),
          }, null, 2),
        },
      ],
    };
  } catch (error) {
    logger.error({ error }, 'Failed to get API health resource');
    return {
      contents: [
        {
          type: 'text',
          text: JSON.stringify({
            apiHealth: { status: 'unhealthy', error: (error as Error).message },
            gatewayStatus: 'healthy',
            lastChecked: new Date().toISOString(),
          }, null, 2),
        },
      ],
    };
  }
}

// Export all resources
export const resources = [
  projectsResource,
  documentTypesResource,
  recentDocumentsResource,
  apiHealthResource,
];

export const resourceHandlers = {
  '1plan://projects': getProjectsResource,
  '1plan://document-types': getDocumentTypesResource,
  '1plan://recent-documents': getRecentDocumentsResource,
  '1plan://api-health': getApiHealthResource,
};
