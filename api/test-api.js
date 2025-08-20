#!/usr/bin/env node

const baseUrl = 'http://localhost:4000/api/v1';

async function testAPI() {
  console.log('🧪 Testing 1Plan API endpoints...\n');

  try {
    // Test health endpoint
    console.log('1. Testing health endpoint...');
    const healthResponse = await fetch('http://localhost:4000/health/live');
    const healthData = await healthResponse.json();
    console.log('✅ Health check:', healthData.status);
    console.log('   Database:', healthData.checks.database.status);
    console.log();

    // First, create a project (we need this for documents)
    console.log('2. Creating a test project...');
    const createProjectResponse = await fetch(`${baseUrl}/projects`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: 'Test Project'
      })
    });

    if (!createProjectResponse.ok) {
      console.log('❌ Failed to create project');
      return;
    }

    const project = await createProjectResponse.json();
    console.log('✅ Project created:', project.id);
    const testProjectId = project.id;
    
    console.log('3. Testing document creation...');
    const createDocResponse = await fetch(`${baseUrl}/documents`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        projectId: testProjectId,
        kind: 'FREEFORM',
        title: 'Test Document',
        content: 'This is a test document content.',
        slug: 'test-document'
      })
    });

    if (createDocResponse.ok) {
      const doc = await createDocResponse.json();
      console.log('✅ Document created:', doc.id);
      
      // Test getting the document
      console.log('4. Testing document retrieval...');
      const getDocResponse = await fetch(`${baseUrl}/documents/${doc.id}`);
      if (getDocResponse.ok) {
        const retrievedDoc = await getDocResponse.json();
        console.log('✅ Document retrieved:', retrievedDoc.title);
      } else {
        console.log('❌ Failed to retrieve document');
      }

      // Test listing documents
      console.log('5. Testing document listing...');
      const listResponse = await fetch(`${baseUrl}/documents`);
      if (listResponse.ok) {
        const list = await listResponse.json();
        console.log('✅ Documents listed:', list.documents?.length || list.length);
      } else {
        console.log('❌ Failed to list documents');
      }

    } else {
      const error = await createDocResponse.text();
      console.log('❌ Failed to create document:', error);
    }

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testAPI();
