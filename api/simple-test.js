#!/usr/bin/env node

async function testEndpoint(url, description) {
  console.log(`Testing: ${description}`);
  console.log(`URL: ${url}`);
  
  try {
    const response = await fetch(url);
    const data = await response.text();
    
    console.log(`Status: ${response.status}`);
    console.log(`Response: ${data}`);
    console.log('✅ Success\n');
    return true;
  } catch (error) {
    console.log(`❌ Error: ${error.message}\n`);
    return false;
  }
}

async function testAPI() {
  console.log('🧪 Simple API Test\n');
  
  // Test simple endpoint first
  await testEndpoint('http://localhost:4000/health/test', 'Simple health test');
  
  // Test full health check
  await testEndpoint('http://localhost:4000/health/live', 'Health check with DB');
  
  // Test project creation
  console.log('Testing: Create project');
  try {
    const response = await fetch('http://localhost:4000/api/v1/projects', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Test Project' })
    });
    
    const data = await response.text();
    console.log(`Status: ${response.status}`);
    console.log(`Response: ${data}`);
    
    if (response.ok) {
      console.log('✅ Project creation success\n');
    } else {
      console.log('❌ Project creation failed\n');
    }
  } catch (error) {
    console.log(`❌ Project creation error: ${error.message}\n`);
  }
}

testAPI();
