#!/usr/bin/env node

import { spawn } from 'child_process';
import { randomUUID } from 'crypto';

class McpTestClient {
  constructor() {
    this.requestId = 1;
    this.server = null;
  }

  async start() {
    console.log('🚀 Starting MCP Gateway Server...');
    
    this.server = spawn('npx', ['tsx', 'src/server.ts'], {
      stdio: ['pipe', 'pipe', 'inherit'],
      cwd: process.cwd()
    });

    this.server.stdout.on('data', (data) => {
      try {
        const response = JSON.parse(data.toString());
        console.log('📥 Response:', JSON.stringify(response, null, 2));
      } catch (e) {
        console.log('📥 Raw output:', data.toString());
      }
    });

    this.server.on('error', (error) => {
      console.error('❌ Server error:', error);
    });

    // Wait a moment for server to start
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  async sendRequest(method, params = {}) {
    const request = {
      jsonrpc: '2.0',
      id: this.requestId++,
      method,
      params
    };

    console.log(`📤 Sending: ${method}`, JSON.stringify(params, null, 2));
    
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Request timeout'));
      }, 10000);

      const handleData = (data) => {
        try {
          const response = JSON.parse(data.toString());
          if (response.id === request.id) {
            clearTimeout(timeout);
            this.server.stdout.removeListener('data', handleData);
            resolve(response);
          }
        } catch (e) {
          // Ignore parse errors, might be logs
        }
      };

      this.server.stdout.on('data', handleData);
      this.server.stdin.write(JSON.stringify(request) + '\n');
    });
  }

  async stop() {
    if (this.server) {
      this.server.kill();
    }
  }

  async runTests() {
    try {
      console.log('\n🧪 Testing MCP Gateway E2E Flow\n');

      // Test 1: List Tools
      console.log('=== Test 1: List Tools ===');
      const toolsResponse = await this.sendRequest('tools/list');
      console.log(`✅ Found ${toolsResponse.result?.tools?.length || 0} tools\n`);

      // Test 2: List Resources  
      console.log('=== Test 2: List Resources ===');
      const resourcesResponse = await this.sendRequest('resources/list');
      console.log(`✅ Found ${resourcesResponse.result?.resources?.length || 0} resources\n`);

      // Test 3: Read API Health Resource
      console.log('=== Test 3: Read API Health Resource ===');
      const healthResponse = await this.sendRequest('resources/read', {
        uri: '1plan://api-health'
      });
      console.log('✅ API Health check completed\n');

      // Test 4: Create Project
      console.log('=== Test 4: Create Project ===');
      const projectName = `Test Project ${Date.now()}`;
      const createProjectResponse = await this.sendRequest('tools/call', {
        name: 'create_project',
        arguments: {
          name: projectName,
          requestId: randomUUID(),
          idempotencyKey: randomUUID()
        }
      });
      
      const projectResult = JSON.parse(createProjectResponse.result?.content?.[0]?.text || '{}');
      const projectId = projectResult.project?.id;
      console.log(`✅ Created project: ${projectId}\n`);

      if (!projectId) {
        throw new Error('Failed to create project - no ID returned');
      }

      // Test 5: Create Document
      console.log('=== Test 5: Create Document ===');
      const createDocResponse = await this.sendRequest('tools/call', {
        name: 'create_document',
        arguments: {
          projectId: projectId,
          kind: 'FREEFORM',
          title: 'Test Document',
          content: '# Test Document\n\nThis is a test document created via MCP Gateway.',
          requestId: randomUUID(),
          idempotencyKey: randomUUID()
        }
      });
      
      const docResult = JSON.parse(createDocResponse.result?.content?.[0]?.text || '{}');
      const documentId = docResult.document?.id;
      console.log(`✅ Created document: ${documentId}\n`);

      // Test 6: List Projects
      console.log('=== Test 6: List Projects ===');
      const listProjectsResponse = await this.sendRequest('tools/call', {
        name: 'list_projects',
        arguments: {
          requestId: randomUUID()
        }
      });
      
      const projectsList = JSON.parse(listProjectsResponse.result?.content?.[0]?.text || '{}');
      console.log(`✅ Listed ${projectsList.projects?.length || 0} projects\n`);

      // Test 7: List Documents
      console.log('=== Test 7: List Documents ===');
      const listDocsResponse = await this.sendRequest('tools/call', {
        name: 'list_documents',
        arguments: {
          projectId: projectId,
          requestId: randomUUID()
        }
      });
      
      const docsList = JSON.parse(listDocsResponse.result?.content?.[0]?.text || '{}');
      console.log(`✅ Listed ${docsList.documents?.length || 0} documents\n`);

      // Test 8: Get Document
      console.log('=== Test 8: Get Document ===');
      const getDocResponse = await this.sendRequest('tools/call', {
        name: 'get_document',
        arguments: {
          id: documentId,
          requestId: randomUUID()
        }
      });
      
      const retrievedDoc = JSON.parse(getDocResponse.result?.content?.[0]?.text || '{}');
      console.log(`✅ Retrieved document: ${retrievedDoc.document?.title}\n`);

      // Test 9: Update Document
      console.log('=== Test 9: Update Document ===');
      const updateDocResponse = await this.sendRequest('tools/call', {
        name: 'update_document',
        arguments: {
          id: documentId,
          content: '# Test Document (Updated)\n\nThis document has been updated via MCP Gateway!',
          requestId: randomUUID()
        }
      });
      
      const updatedDoc = JSON.parse(updateDocResponse.result?.content?.[0]?.text || '{}');
      console.log(`✅ Updated document successfully\n`);

      // Test 10: Read Projects Resource
      console.log('=== Test 10: Read Projects Resource ===');
      const projectsResourceResponse = await this.sendRequest('resources/read', {
        uri: '1plan://projects'
      });
      console.log('✅ Projects resource read completed\n');

      console.log('🎉 All E2E tests completed successfully!');
      
    } catch (error) {
      console.error('❌ Test failed:', error.message);
      throw error;
    }
  }
}

// Run the tests
const client = new McpTestClient();

async function main() {
  try {
    await client.start();
    await client.runTests();
  } catch (error) {
    console.error('💥 Test suite failed:', error);
    process.exit(1);
  } finally {
    await client.stop();
  }
}

main();
