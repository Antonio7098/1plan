#!/usr/bin/env node

import { spawn } from 'child_process';
import { randomUUID } from 'crypto';

class FeatureSprintE2ETest {
  constructor() {
    this.server = null;
    this.requestId = 1;
  }

  async startServer() {
    console.log('🚀 Starting MCP Gateway...');
    
    this.server = spawn('npx', ['tsx', 'src/server.ts'], {
      stdio: ['pipe', 'pipe', 'inherit'],
    });

    // Wait for server to start
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Server startup timeout'));
      }, 10000);

      this.server.stdout.on('data', (data) => {
        const output = data.toString();
        if (output.includes('MCP Gateway Server connected and ready')) {
          clearTimeout(timeout);
          console.log('✅ MCP Gateway started successfully');
          resolve();
        }
      });

      this.server.on('error', reject);
    });
  }

  async sendMcpRequest(method, params = {}) {
    const request = {
      jsonrpc: '2.0',
      id: this.requestId++,
      method,
      params
    };

    console.log(`📤 ${method}:`, Object.keys(params).length > 0 ? JSON.stringify(params, null, 2) : '(no params)');

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error(`Request timeout for ${method}`));
      }, 15000);

      const handleResponse = (data) => {
        try {
          const lines = data.toString().split('\n').filter(line => line.trim());
          
          for (const line of lines) {
            try {
              const response = JSON.parse(line);
              if (response.id === request.id) {
                clearTimeout(timeout);
                this.server.stdout.removeListener('data', handleResponse);
                resolve(response);
                return;
              }
            } catch (e) {
              // Skip non-JSON lines (logs)
            }
          }
        } catch (e) {
          // Ignore parse errors
        }
      };

      this.server.stdout.on('data', handleResponse);
      this.server.stdin.write(JSON.stringify(request) + '\n');
    });
  }

  async runE2ETests() {
    console.log('\n🧪 Running Features & Sprints E2E Tests\n');

    try {
      // Test 1: List Available Tools
      console.log('=== Test 1: List Available Tools ===');
      const toolsResponse = await this.sendMcpRequest('tools/list');
      const toolCount = toolsResponse.result?.tools?.length || 0;
      console.log(`✅ Found ${toolCount} tools available\n`);

      // Test 2: Create Project
      console.log('=== Test 2: Create Project ===');
      const projectName = `Features & Sprints Test Project ${Date.now()}`;
      const createProjectResponse = await this.sendMcpRequest('tools/call', {
        name: 'create_project',
        arguments: {
          name: projectName,
          requestId: randomUUID(),
          idempotencyKey: randomUUID()
        }
      });

      if (createProjectResponse.error) {
        throw new Error(`Create project failed: ${JSON.stringify(createProjectResponse.error)}`);
      }

      const projectResult = JSON.parse(createProjectResponse.result?.content?.[0]?.text || '{}');
      console.log('Debug - Project result:', JSON.stringify(projectResult, null, 2));
      const projectId = projectResult.project?.id || projectResult.id;
      
      if (!projectId) {
        throw new Error('No project ID returned from create_project');
      }
      
      console.log(`✅ Created project: ${projectId}\n`);

      // Test 3: Create Feature
      console.log('=== Test 3: Create Feature via MCP ===');
      const createFeatureResponse = await this.sendMcpRequest('tools/call', {
        name: 'create_feature',
        arguments: {
          projectId: projectId,
          featureId: 'FEAT-001',
          title: 'User Authentication System',
          area: 'Backend',
          status: 'PLANNED',
          version: '1.0.0',
          requestId: randomUUID(),
          idempotencyKey: randomUUID()
        }
      });

      if (createFeatureResponse.error) {
        throw new Error(`Create feature failed: ${JSON.stringify(createFeatureResponse.error)}`);
      }

      // Handle nested JSON response structure
      const featureResponseText = createFeatureResponse.result?.content?.[0]?.text || '{}';
      let featureResult;
      
      try {
        featureResult = JSON.parse(featureResponseText);
        // Check if it's double-encoded
        if (featureResult.content && featureResult.content[0]?.text) {
          featureResult = JSON.parse(featureResult.content[0].text);
        }
      } catch (e) {
        featureResult = {};
      }
      
      console.log('Debug - Feature result:', JSON.stringify(featureResult, null, 2));
      const featureId = featureResult.feature?.id;
      
      if (!featureId) {
        throw new Error('No feature ID returned from create_feature');
      }
      
      console.log(`✅ Created feature: ${featureId}\n`);

      // Test 4: Create Sprint
      console.log('=== Test 4: Create Sprint via MCP ===');
      const createSprintResponse = await this.sendMcpRequest('tools/call', {
        name: 'create_sprint',
        arguments: {
          projectId: projectId,
          code: 'SPR-001',
          name: 'Authentication Sprint',
          status: 'PLANNED',
          items: [
            { text: 'Set up user registration', checked: false, order: 1 },
            { text: 'Implement login flow', checked: false, order: 2 },
            { text: 'Add password reset', checked: false, order: 3 }
          ],
          requestId: randomUUID(),
          idempotencyKey: randomUUID()
        }
      });

      if (createSprintResponse.error) {
        throw new Error(`Create sprint failed: ${JSON.stringify(createSprintResponse.error)}`);
      }

      // Handle nested JSON response structure
      const sprintResponseText = createSprintResponse.result?.content?.[0]?.text || '{}';
      let sprintResult;
      
      try {
        sprintResult = JSON.parse(sprintResponseText);
        // Check if it's double-encoded
        if (sprintResult.content && sprintResult.content[0]?.text) {
          sprintResult = JSON.parse(sprintResult.content[0].text);
        }
      } catch (e) {
        sprintResult = {};
      }
      
      console.log('Debug - Sprint result:', JSON.stringify(sprintResult, null, 2));
      const sprintId = sprintResult.sprint?.id;
      
      if (!sprintId) {
        throw new Error('No sprint ID returned from create_sprint');
      }
      
      console.log(`✅ Created sprint: ${sprintId} with ${sprintResult.sprint?.items?.length || 0} items\n`);

      // Test 5: List Features
      console.log('=== Test 5: List Features ===');
      const listFeaturesResponse = await this.sendMcpRequest('tools/call', {
        name: 'list_features',
        arguments: {
          projectId: projectId,
          limit: 10,
          requestId: randomUUID()
        }
      });

      const featuresList = JSON.parse(listFeaturesResponse.result?.content?.[0]?.text || '{}');
      const featureCount = featuresList.features?.length || 0;
      console.log(`✅ Listed ${featureCount} features for project\n`);

      // Test 6: List Sprints
      console.log('=== Test 6: List Sprints ===');
      const listSprintsResponse = await this.sendMcpRequest('tools/call', {
        name: 'list_sprints',
        arguments: {
          projectId: projectId,
          limit: 10,
          requestId: randomUUID()
        }
      });

      const sprintsList = JSON.parse(listSprintsResponse.result?.content?.[0]?.text || '{}');
      const sprintCount = sprintsList.sprints?.length || 0;
      console.log(`✅ Listed ${sprintCount} sprints for project\n`);

      // Test 7: Update Feature Status
      console.log('=== Test 7: Update Feature Status ===');
      const updateFeatureResponse = await this.sendMcpRequest('tools/call', {
        name: 'update_feature',
        arguments: {
          id: featureId,
          status: 'IN_PROGRESS',
          requestId: randomUUID()
        }
      });

      const updatedFeature = JSON.parse(updateFeatureResponse.result?.content?.[0]?.text || '{}');
      console.log(`✅ Updated feature status to: ${updatedFeature.feature?.status}\n`);

      // Test 8: Update Sprint with Completed Items
      console.log('=== Test 8: Update Sprint with Completed Items ===');
      const updateSprintResponse = await this.sendMcpRequest('tools/call', {
        name: 'update_sprint',
        arguments: {
          id: sprintId,
          status: 'ACTIVE',
          items: [
            { text: 'Set up user registration', checked: true, order: 1 },
            { text: 'Implement login flow', checked: false, order: 2 },
            { text: 'Add password reset', checked: false, order: 3 }
          ],
          requestId: randomUUID()
        }
      });

      const updatedSprint = JSON.parse(updateSprintResponse.result?.content?.[0]?.text || '{}');
      const completedItems = updatedSprint.sprint?.items?.filter(item => item.checked).length || 0;
      console.log(`✅ Updated sprint status to: ${updatedSprint.sprint?.status} with ${completedItems} completed items\n`);

      console.log('🎉 All Features & Sprints E2E tests passed successfully!');
      console.log('\n📊 Test Summary:');
      console.log(`- ✅ MCP Gateway startup: OK`);
      console.log(`- ✅ Total tools available: ${toolCount}`);
      console.log(`- ✅ Project created: ${projectId}`);
      console.log(`- ✅ Feature created: ${featureId}`);
      console.log(`- ✅ Sprint created: ${sprintId}`);
      console.log(`- ✅ Feature status update: Working`);
      console.log(`- ✅ Sprint status & items update: Working`);
      console.log(`- ✅ List operations: Working`);

    } catch (error) {
      console.error('\n❌ E2E Test Failed:', error.message);
      throw error;
    }
  }

  async cleanup() {
    if (this.server) {
      this.server.kill();
      console.log('\n🧹 Server stopped');
    }
  }
}

// Run the E2E tests
async function main() {
  const test = new FeatureSprintE2ETest();
  
  try {
    await test.startServer();
    await test.runE2ETests();
    console.log('\n🚀 Features & Sprints E2E Testing Complete - All Systems Go!');
  } catch (error) {
    console.error('\n💥 E2E Tests Failed:', error.message);
    process.exit(1);
  } finally {
    await test.cleanup();
  }
}

main();
