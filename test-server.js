#!/usr/bin/env node

/**
 * Simple test script to verify server initialization
 */

const { spawn } = require('child_process');

const server = spawn('node', ['dist/index.js'], {
  stdio: ['pipe', 'pipe', 'pipe']
});

let stdoutData = '';
let stderrData = '';

server.stdout.on('data', (data) => {
  stdoutData += data.toString();
});

server.stderr.on('data', (data) => {
  stderrData += data.toString();
  console.error('STDERR:', data.toString());
});

// Send a simple JSON-RPC request to list tools
setTimeout(() => {
  const request = {
    jsonrpc: '2.0',
    id: 1,
    method: 'tools/list',
    params: {}
  };

  server.stdin.write(JSON.stringify(request) + '\n');
}, 1000);

// Wait for response
setTimeout(() => {
  console.log('STDOUT:', stdoutData);
  console.log('\n=== Test Results ===');

  if (stderrData.includes('Failed to initialize') || stderrData.includes('Error')) {
    console.error('❌ Server initialization FAILED');
    process.exit(1);
  } else if (stdoutData.includes('tools')) {
    console.log('✅ Server initialized successfully and responded to tool list request');
    process.exit(0);
  } else {
    console.log('⚠️  Server started but no valid response received');
    process.exit(1);
  }
}, 2000);

// Cleanup
setTimeout(() => {
  server.kill();
}, 3000);