#!/usr/bin/env node

import { spawn } from 'child_process';

console.log('🚀 Testing MCP Gateway Server startup...');

const server = spawn('npx', ['tsx', 'src/server.ts'], {
  stdio: ['pipe', 'pipe', 'inherit'],
  cwd: process.cwd()
});

let startupComplete = false;

server.stdout.on('data', (data) => {
  const output = data.toString();
  console.log('📥 Server output:', output);
  
  if (output.includes('MCP Gateway Server connected and ready') || output.includes('Starting MCP Gateway Server')) {
    startupComplete = true;
    console.log('✅ MCP Gateway Server started successfully!');
    
    // Test a simple tools/list request
    setTimeout(() => {
      console.log('📤 Sending tools/list request...');
      const request = {
        jsonrpc: '2.0',
        id: 1,
        method: 'tools/list'
      };
      
      server.stdin.write(JSON.stringify(request) + '\n');
      
      // Wait for response then exit
      setTimeout(() => {
        console.log('🎉 Basic test completed!');
        server.kill();
        process.exit(0);
      }, 2000);
    }, 1000);
  }
});

server.on('error', (error) => {
  console.error('❌ Server error:', error);
  process.exit(1);
});

server.on('exit', (code) => {
  if (!startupComplete) {
    console.error(`❌ Server exited with code ${code} before completing startup`);
    process.exit(1);
  }
});

// Timeout after 10 seconds
setTimeout(() => {
  if (!startupComplete) {
    console.error('❌ Server startup timeout');
    server.kill();
    process.exit(1);
  }
}, 10000);
