#!/usr/bin/env node

/**
 * Installation verification script for Context Engineering MCP Server
 * This script verifies that the project can be built and the main functionality works
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('🔍 Verifying Context Engineering MCP Server Installation...\n');

// Test 1: Verify essential files exist
console.log('1. Checking essential files...');
const essentialFiles = [
    'src/index.ts',
    'src/tools/index.ts',
    'src/lib/prp-generator.ts',
    'src/lib/template-manager.ts',
    'package.json',
    'tsconfig.json'
];

for (const file of essentialFiles) {
    if (!fs.existsSync(file)) {
        console.error(`❌ Missing essential file: ${file}`);
        process.exit(1);
    }
}
console.log('✅ All essential files present');

// Test 2: Verify TypeScript compilation
console.log('\n2. Testing TypeScript compilation...');
try {
    execSync('npm run build', { stdio: 'pipe' });
    console.log('✅ TypeScript compilation successful');
} catch (error) {
    console.error('❌ TypeScript compilation failed');
    console.error(error.toString());
    process.exit(1);
}

// Test 3: Verify built files exist
console.log('\n3. Checking built files...');
if (!fs.existsSync('dist/index.js')) {
    console.error('❌ Main build file missing: dist/index.js');
    process.exit(1);
}
console.log('✅ Build files present');

// Test 4: Basic functionality test
console.log('\n4. Testing basic MCP server functionality...');
try {
    const mcpServer = require('./dist/index.js');
    if (!mcpServer) {
        throw new Error('MCP server module not exported properly');
    }
    console.log('✅ MCP server module loads correctly');
} catch (error) {
    console.error('❌ MCP server functionality test failed');
    console.error(error.toString());
    process.exit(1);
}

// Test 5: Verify templates directory
console.log('\n5. Checking templates...');
if (!fs.existsSync('templates/basic-web-app.json')) {
    console.error('❌ Template files missing');
    process.exit(1);
}
console.log('✅ Template files present');

console.log('\n🎉 Installation verification complete!');
console.log('\nTo use this MCP server:');
console.log('1. Add to your Claude Desktop config:');
console.log('   "context-engineering-mcp": {');
console.log('     "command": "node",');
console.log(`     "args": ["${process.cwd()}/dist/index.js"]`);
console.log('   }');
console.log('2. Restart Claude Desktop');
console.log('3. Use tools like generate-prp, create-initial-md, etc.');