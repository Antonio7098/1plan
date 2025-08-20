#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ErrorCode,
  ListResourcesRequestSchema,
  ListToolsRequestSchema,
  McpError,
  ReadResourceRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';

import { config } from './lib/config.js';
import { logger } from './lib/logger.js';
import { documentTools, documentHandlers } from './tools/documents.js';
import { projectTools, projectHandlers } from './tools/projects.js';
import { featureTools, featureHandlers } from './tools/features.js';
import { sprintTools, sprintHandlers } from './tools/sprints.js';
import { resources, resourceHandlers } from './resources/index.js';

class McpGatewayServer {
  private server: Server;
  private tools: any[];
  private toolHandlers: Record<string, Function>;

  constructor() {
    this.server = new Server(
      {
        name: config.MCP_SERVER_NAME,
        version: config.MCP_SERVER_VERSION,
      },
      {
        capabilities: {
          resources: {},
          tools: {},
        },
      }
    );

    this.tools = [...documentTools, ...projectTools, ...featureTools, ...sprintTools];
    this.toolHandlers = { ...documentHandlers, ...projectHandlers, ...featureHandlers, ...sprintHandlers };

    this.setupHandlers();
  }

  private setupHandlers(): void {
    // Handle tool listing
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      logger.debug({ toolCount: this.tools.length }, 'Listing available tools');
      return {
        tools: this.tools,
      };
    });

    // Handle tool execution
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;
      
      logger.info({ toolName: name, args }, 'Executing tool');

      try {
        const handler = this.toolHandlers[name];
        if (!handler) {
          throw new McpError(
            ErrorCode.MethodNotFound,
            `Unknown tool: ${name}`
          );
        }

        const result = await handler(args || {});
        
        logger.info({ toolName: name, success: true }, 'Tool execution completed');
        
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      } catch (error) {
        logger.error({ toolName: name, error }, 'Tool execution failed');
        
        if (error instanceof McpError) {
          throw error;
        }

        // Convert regular errors to MCP errors
        throw new McpError(
          ErrorCode.InternalError,
          `Tool execution failed: ${error instanceof Error ? error.message : 'Unknown error'}`
        );
      }
    });

    // Handle resource listing
    this.server.setRequestHandler(ListResourcesRequestSchema, async () => {
      logger.debug({ resourceCount: resources.length }, 'Listing available resources');
      return {
        resources,
      };
    });

    // Handle resource reading
    this.server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
      const { uri } = request.params;
      
      logger.debug({ uri }, 'Reading resource');

      try {
        const handler = resourceHandlers[uri as keyof typeof resourceHandlers];
        if (!handler) {
          throw new McpError(
            ErrorCode.InvalidRequest,
            `Unknown resource: ${uri}`
          );
        }

        const result = await handler();
        
        logger.debug({ uri, success: true }, 'Resource read completed');
        
        return result;
      } catch (error) {
        logger.error({ uri, error }, 'Resource read failed');
        
        if (error instanceof McpError) {
          throw error;
        }

        throw new McpError(
          ErrorCode.InternalError,
          `Resource read failed: ${error instanceof Error ? error.message : 'Unknown error'}`
        );
      }
    });

    // Error handling
    this.server.onerror = (error) => {
      logger.error({ error }, 'MCP Server error');
    };

    process.on('SIGINT', async () => {
      logger.info('Received SIGINT, shutting down gracefully...');
      await this.server.close();
      process.exit(0);
    });

    process.on('SIGTERM', async () => {
      logger.info('Received SIGTERM, shutting down gracefully...');
      await this.server.close();
      process.exit(0);
    });
  }

  async start(): Promise<void> {
    const transport = new StdioServerTransport();
    
    logger.info({
      serverName: config.MCP_SERVER_NAME,
      version: config.MCP_SERVER_VERSION,
      apiBaseUrl: config.API_BASE_URL,
      toolCount: this.tools.length,
      resourceCount: resources.length,
    }, '🚀 Starting MCP Gateway Server');

    try {
      await this.server.connect(transport);
      logger.info('✅ MCP Gateway Server connected and ready');
    } catch (error) {
      logger.error({ error }, '❌ Failed to start MCP Gateway Server');
      process.exit(1);
    }
  }
}

// Start the server
const server = new McpGatewayServer();
server.start().catch((error) => {
  logger.error({ error }, 'Fatal error starting server');
  process.exit(1);
});
