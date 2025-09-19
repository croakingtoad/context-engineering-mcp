/**
 * Test suite for project structure validation
 * These tests verify the foundational project structure is correctly set up
 */

const fs = require('fs');
const path = require('path');

describe('Project Structure Tests', () => {
  const projectRoot = path.resolve(__dirname, '..');

  describe('Package Configuration', () => {
    test('package.json should exist and be valid', () => {
      const packagePath = path.join(projectRoot, 'package.json');
      expect(fs.existsSync(packagePath)).toBe(true);

      const packageContent = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
      expect(packageContent.name).toBe('context-engineering-mcp-server');
      expect(packageContent.dependencies).toHaveProperty('@modelcontextprotocol/sdk');
      expect(packageContent.devDependencies).toHaveProperty('typescript');
      expect(packageContent.devDependencies).toHaveProperty('jest');
      expect(packageContent.scripts).toHaveProperty('build');
      expect(packageContent.scripts).toHaveProperty('test');
      expect(packageContent.scripts).toHaveProperty('dev');
    });

    test('TypeScript configuration should exist', () => {
      const tsconfigPath = path.join(projectRoot, 'tsconfig.json');
      expect(fs.existsSync(tsconfigPath)).toBe(true);

      const tsconfig = JSON.parse(fs.readFileSync(tsconfigPath, 'utf8'));
      expect(tsconfig.compilerOptions.target).toBe('ES2020');
      expect(tsconfig.compilerOptions.module).toBe('commonjs');
      expect(tsconfig.compilerOptions.outDir).toBe('./dist');
      expect(tsconfig.compilerOptions.strict).toBe(true);
    });

    test('ESLint configuration should exist', () => {
      const eslintPath = path.join(projectRoot, '.eslintrc.js');
      expect(fs.existsSync(eslintPath)).toBe(true);
    });

    test('Prettier configuration should exist', () => {
      const prettierPath = path.join(projectRoot, '.prettierrc');
      expect(fs.existsSync(prettierPath)).toBe(true);
    });
  });

  describe('Directory Structure', () => {
    test('src directory should exist with proper subdirectories', () => {
      const srcPath = path.join(projectRoot, 'src');
      expect(fs.existsSync(srcPath)).toBe(true);
      expect(fs.lstatSync(srcPath).isDirectory()).toBe(true);

      // Check subdirectories
      const requiredSubdirs = ['tools', 'resources', 'lib', 'types'];
      requiredSubdirs.forEach(subdir => {
        const subdirPath = path.join(srcPath, subdir);
        expect(fs.existsSync(subdirPath)).toBe(true);
        expect(fs.lstatSync(subdirPath).isDirectory()).toBe(true);
      });
    });

    test('templates directory should exist', () => {
      const templatesPath = path.join(projectRoot, 'templates');
      expect(fs.existsSync(templatesPath)).toBe(true);
      expect(fs.lstatSync(templatesPath).isDirectory()).toBe(true);
    });

    test('external directory should exist with context-engineering-intro', () => {
      const externalPath = path.join(projectRoot, 'external');
      expect(fs.existsSync(externalPath)).toBe(true);
      expect(fs.lstatSync(externalPath).isDirectory()).toBe(true);

      const contextEngineeringPath = path.join(externalPath, 'context-engineering-intro');
      expect(fs.existsSync(contextEngineeringPath)).toBe(true);
    });

    test('test directory should exist', () => {
      const testPath = path.join(projectRoot, 'test');
      expect(fs.existsSync(testPath)).toBe(true);
      expect(fs.lstatSync(testPath).isDirectory()).toBe(true);
    });
  });

  describe('Core Files', () => {
    test('main server file should exist', () => {
      const serverPath = path.join(projectRoot, 'src', 'index.ts');
      expect(fs.existsSync(serverPath)).toBe(true);
    });

    test('tool registration file should exist', () => {
      const toolsIndexPath = path.join(projectRoot, 'src', 'tools', 'index.ts');
      expect(fs.existsSync(toolsIndexPath)).toBe(true);
    });

    test('resource registration file should exist', () => {
      const resourcesIndexPath = path.join(projectRoot, 'src', 'resources', 'index.ts');
      expect(fs.existsSync(resourcesIndexPath)).toBe(true);
    });

    test('sync script should exist and be executable', () => {
      const syncScriptPath = path.join(projectRoot, 'scripts', 'sync-templates.sh');
      expect(fs.existsSync(syncScriptPath)).toBe(true);

      const stats = fs.lstatSync(syncScriptPath);
      expect((stats.mode & parseInt('111', 8)) > 0).toBe(true); // Check if executable
    });

    test('gitignore should exist', () => {
      const gitignorePath = path.join(projectRoot, '.gitignore');
      expect(fs.existsSync(gitignorePath)).toBe(true);
    });
  });

  describe('MCP Server Configuration', () => {
    test('MCP server should be properly structured', () => {
      const serverPath = path.join(projectRoot, 'src', 'index.ts');
      if (fs.existsSync(serverPath)) {
        const serverContent = fs.readFileSync(serverPath, 'utf8');
        expect(serverContent).toContain('@modelcontextprotocol/sdk');
        expect(serverContent).toContain('new Server');
        expect(serverContent).toContain('StdioServerTransport');
      }
    });
  });
});

describe('Dependency Resolution Tests', () => {
  const projectRoot = path.resolve(__dirname, '..');

  test('node_modules should exist after npm install', () => {
    const nodeModulesPath = path.join(projectRoot, 'node_modules');
    // This test will pass once we run npm install
    if (fs.existsSync(path.join(projectRoot, 'package.json'))) {
      expect(fs.existsSync(nodeModulesPath)).toBe(true);
    }
  });

  test('MCP SDK should be properly installed', () => {
    const nodeModulesPath = path.join(projectRoot, 'node_modules');
    const mcpSdkPath = path.join(nodeModulesPath, '@modelcontextprotocol');

    if (fs.existsSync(nodeModulesPath)) {
      expect(fs.existsSync(mcpSdkPath)).toBe(true);
    }
  });
});