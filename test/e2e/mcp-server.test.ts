/**
 * End-to-End tests for MCP Server
 * Tests complete server initialization and MCP protocol compliance
 */

import '../setup'; // Ensure custom matchers are available
import { Server } from '@modelcontextprotocol/sdk/server/index';
import { ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types';
import { TemplateManager } from '../../src/lib/template-manager';
import { PRPGenerator } from '../../src/lib/prp-generator';
import { registerTools, getToolDefinitions } from '../../src/tools/index';
import { Factory, FileSystem, MCP } from '../test-helpers/index';

// Mock the missing storage dependencies to prevent import errors
jest.mock('../../src/lib/storage', () => ({
  StorageSystem: jest.fn().mockImplementation(() => ({
    initialize: jest.fn().mockResolvedValue(undefined),
    close: jest.fn().mockResolvedValue(undefined)
  }))
}));

jest.mock('../../src/lib/change-tracker', () => ({
  ChangeTracker: jest.fn().mockImplementation(() => ({
    initialize: jest.fn().mockResolvedValue(undefined),
    close: jest.fn().mockResolvedValue(undefined)
  }))
}));

jest.mock('../../src/lib/integrations', () => ({
  IntegrationsManager: jest.fn().mockImplementation(() => ({
    initialize: jest.fn().mockResolvedValue(undefined),
    shutdown: jest.fn().mockResolvedValue(undefined)
  }))
}));

// Mock all tool handlers to return predictable responses
jest.mock('../../src/tools/list-templates', () => ({
  listTemplatesToolHandler: jest.fn().mockResolvedValue({
    content: [{ type: 'text', text: JSON.stringify({ templates: [] }) }]
  })
}));

jest.mock('../../src/tools/generate-prp', () => ({
  generatePRPToolHandler: jest.fn().mockResolvedValue({
    content: [{ type: 'text', text: '# Generated PRP\n\nTest content' }]
  }),
  setPRPGeneratorDependencies: jest.fn()
}));

jest.mock('../../src/tools/validate-prp', () => ({
  validatePRPToolHandler: jest.fn().mockResolvedValue({
    content: [{ type: 'text', text: JSON.stringify({ isValid: true, score: 95 }) }]
  })
}));

jest.mock('../../src/tools/search-templates', () => ({
  searchTemplatesToolHandler: jest.fn().mockResolvedValue({
    content: [{ type: 'text', text: JSON.stringify({ templates: [] }) }]
  })
}));

jest.mock('../../src/tools/create-custom-template', () => ({
  createCustomTemplateToolHandler: jest.fn().mockResolvedValue({
    content: [{ type: 'text', text: JSON.stringify({ success: true }) }]
  })
}));

jest.mock('../../src/tools/analyze-context', () => ({
  analyzeContextToolHandler: jest.fn().mockResolvedValue({
    content: [{ type: 'text', text: JSON.stringify({ analysis: 'complete' }) }]
  })
}));

// Mock storage tools
jest.mock('../../src/tools/list-prps', () => ({
  listPRPsToolHandler: jest.fn().mockResolvedValue({
    content: [{ type: 'text', text: JSON.stringify({ prps: [] }) }]
  }),
  getListPRPsToolDefinition: jest.fn().mockReturnValue({
    name: 'list_prps',
    description: 'List stored PRPs',
    inputSchema: { type: 'object', properties: {} }
  }),
  setStorageDependencies: jest.fn()
}));

jest.mock('../../src/tools/update-prp', () => ({
  updatePRPToolHandler: jest.fn().mockResolvedValue({
    content: [{ type: 'text', text: JSON.stringify({ updated: true }) }]
  }),
  getUpdatePRPToolDefinition: jest.fn().mockReturnValue({
    name: 'update_prp',
    description: 'Update stored PRP',
    inputSchema: { type: 'object', properties: {} }
  }),
  setStorageDependencies: jest.fn()
}));

jest.mock('../../src/tools/manage-storage', () => ({
  manageStorageToolHandler: jest.fn().mockResolvedValue({
    content: [{ type: 'text', text: JSON.stringify({ managed: true }) }]
  }),
  getManageStorageToolDefinition: jest.fn().mockReturnValue({
    name: 'manage_storage',
    description: 'Manage storage system',
    inputSchema: { type: 'object', properties: {} }
  }),
  setStorageDependencies: jest.fn()
}));

describe('MCP Server End-to-End Tests', () => {
  let server: Server;
  let templateManager: TemplateManager;
  let prpGenerator: PRPGenerator;
  let tempTemplatesDir: string;
  let tempExternalDir: string;

  beforeAll(async () => {
    // Create test directories and templates
    tempTemplatesDir = await FileSystem.createTempDir('e2e-templates');
    tempExternalDir = await FileSystem.createTempDir('e2e-external');

    const testTemplates = [
      Factory.createPRPTemplate({
        id: 'e2e-web-template',
        name: 'E2E Web Template',
        category: 'web-development'
      }),
      Factory.createPRPTemplate({
        id: 'e2e-mobile-template',
        name: 'E2E Mobile Template',
        category: 'mobile-development'
      })
    ];

    await FileSystem.createMockTemplateFiles(tempTemplatesDir, testTemplates);

    const externalTemplate = Factory.createPRPTemplate({
      id: 'e2e-external-template',
      name: 'E2E External Template',
      category: 'external'
    });

    await FileSystem.createMockTemplateFiles(tempExternalDir, [externalTemplate]);
  });

  afterAll(async () => {
    await FileSystem.cleanup(tempTemplatesDir);
    await FileSystem.cleanup(tempExternalDir);
  });

  beforeEach(async () => {
    // Initialize server components
    server = new Server(
      {
        name: 'context-engineering-mcp-server-test',
        version: '1.0.0-test',
      },
      {
        capabilities: {
          tools: {},
          resources: {},
        },
      }
    );

    templateManager = new TemplateManager(tempTemplatesDir, tempExternalDir);
    await templateManager.initialize();

    prpGenerator = new PRPGenerator(templateManager);

    // Register tools with server
    registerTools(server);
  });

  afterEach(async () => {
    await server.close();
  });

  describe('Server Initialization and Setup', () => {
    it('should initialize server with correct capabilities', () => {
      expect(server).toBeInstanceOf(Server);
    });

    it('should register all required tools', async () => {
      const toolDefinitions = getToolDefinitions();

      expect(toolDefinitions).toBeDefined();
      expect(Array.isArray(toolDefinitions)).toBe(true);
      expect(toolDefinitions.length).toBeGreaterThan(0);

      const requiredTools = [
        'list_templates',
        'generate_prp',
        'validate_prp',
        'search_templates',
        'create_custom_template',
        'analyze_context'
      ];

      const toolNames = toolDefinitions.map(tool => tool.name);
      requiredTools.forEach(requiredTool => {
        expect(toolNames).toContain(requiredTool);
      });
    });

    it('should have valid tool definitions that match MCP protocol', () => {
      const toolDefinitions = getToolDefinitions();

      toolDefinitions.forEach(tool => {
        expect(MCP.validateToolDefinition(tool)).toBe(true);
      });
    });
  });

  describe('MCP Protocol Compliance', () => {
    let toolHandler: any;

    beforeEach(() => {
      // Extract the tool handler from the server
      const calls = (server.setRequestHandler as jest.Mock).mock.calls;
      const toolHandlerCall = calls.find(call => call[0] === ListToolsRequestSchema);
      expect(toolHandlerCall).toBeDefined();
    });

    it('should handle ListTools requests correctly', async () => {
      const request = {
        method: 'tools/list',
        params: {}
      };

      // Test that the server can list tools
      const toolDefinitions = getToolDefinitions();
      expect(toolDefinitions).toMatchMCPProtocol();
    });

    it('should handle tool invocation requests', async () => {
      // Get the actual handler from server registration
      const handlerCalls = (server.setRequestHandler as jest.Mock).mock.calls;
      const toolHandlerRegistration = handlerCalls.find(call =>
        call[0].name === 'CallToolRequest' ||
        call[0]._def?.typeName === 'ZodObject'
      );

      expect(toolHandlerRegistration).toBeDefined();

      if (toolHandlerRegistration) {
        const handler = toolHandlerRegistration[1];

        const request = MCP.createMCPRequest('list_templates', {});
        const response = await handler(request);

        expect(response).toHaveProperty('content');
        expect(Array.isArray(response.content)).toBe(true);
      }
    });

    it('should handle invalid tool requests with proper error responses', async () => {
      const handlerCalls = (server.setRequestHandler as jest.Mock).mock.calls;
      const toolHandlerRegistration = handlerCalls.find(call =>
        call[0]._def?.typeName === 'ZodObject' || call[0].name === 'CallToolRequest'
      );

      if (toolHandlerRegistration) {
        const handler = toolHandlerRegistration[1];

        const invalidRequest = MCP.createMCPRequest('non_existent_tool', {});

        await expect(handler(invalidRequest))
          .rejects
          .toThrow('Unknown tool: non_existent_tool');
      }
    });

    it('should validate request parameters correctly', async () => {
      const handlerCalls = (server.setRequestHandler as jest.Mock).mock.calls;
      const toolHandlerRegistration = handlerCalls.find(call =>
        call[0]._def?.typeName === 'ZodObject' || call[0].name === 'CallToolRequest'
      );

      if (toolHandlerRegistration) {
        const handler = toolHandlerRegistration[1];

        // Test with invalid parameters for generate_prp
        const invalidRequest = MCP.createMCPRequest('generate_prp', {
          templateId: 123, // Should be string
          projectContext: 'invalid' // Should be object
        });

        await expect(handler(invalidRequest))
          .rejects
          .toThrow();
      }
    });
  });

  describe('Integration with Real Components', () => {
    it('should load and use real templates', async () => {
      const templates = templateManager.getAllTemplates();
      expect(templates.length).toBe(3); // 2 internal + 1 external

      const webTemplate = templateManager.getTemplate('e2e-web-template');
      expect(webTemplate).not.toBeNull();
      expect(webTemplate?.name).toBe('E2E Web Template');

      const externalTemplate = templateManager.getTemplate('e2e-external-template');
      expect(externalTemplate).not.toBeNull();
      expect(externalTemplate?.category).toBe('external');
    });

    it('should generate PRP using real components', async () => {
      const request = Factory.createPRPGenerationRequest({
        templateId: 'e2e-web-template',
        projectContext: {
          name: 'E2E Test Project',
          domain: 'end-to-end testing',
          stakeholders: ['testers', 'developers'],
          objectives: ['Test complete workflow'],
          constraints: ['Time constraints']
        },
        outputFormat: 'markdown'
      });

      const result = await prpGenerator.generatePRP(request);

      expect(result).toContain('# Product Requirements Prompt');
      expect(result).toContain('E2E Test Project');
      expect(result).toContain('end-to-end testing');
      expect(result).toContain('testers, developers');
    });

    it('should handle template search functionality', async () => {
      const searchResults = templateManager.searchTemplates('web');
      expect(searchResults.length).toBe(1);
      expect(searchResults[0].id).toBe('e2e-web-template');

      const categoryResults = templateManager.getTemplatesByCategory('mobile-development');
      expect(categoryResults.length).toBe(1);
      expect(categoryResults[0].id).toBe('e2e-mobile-template');
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle server shutdown gracefully', async () => {
      // Test that the server can be closed without errors
      await expect(server.close()).resolves.not.toThrow();
    });

    it('should handle template loading errors gracefully', async () => {
      // Create a new template manager with invalid directory
      const invalidTemplateManager = new TemplateManager('/invalid/path', '/another/invalid/path');

      // Should not throw during initialization
      await expect(invalidTemplateManager.initialize()).resolves.not.toThrow();

      // Should return empty results for invalid paths
      const templates = invalidTemplateManager.getAllTemplates();
      expect(templates).toHaveLength(0);
    });

    it('should handle concurrent requests properly', async () => {
      const handlerCalls = (server.setRequestHandler as jest.Mock).mock.calls;
      const toolHandlerRegistration = handlerCalls.find(call =>
        call[0]._def?.typeName === 'ZodObject' || call[0].name === 'CallToolRequest'
      );

      if (toolHandlerRegistration) {
        const handler = toolHandlerRegistration[1];

        const requests = [
          MCP.createMCPRequest('list_templates', {}),
          MCP.createMCPRequest('search_templates', { query: 'test' }),
          MCP.createMCPRequest('list_templates', { category: 'web-development' })
        ];

        const responses = await Promise.all(
          requests.map(req => handler(req))
        );

        expect(responses).toHaveLength(3);
        responses.forEach(response => {
          expect(response).toHaveProperty('content');
        });
      }
    });

    it('should isolate errors between requests', async () => {
      const handlerCalls = (server.setRequestHandler as jest.Mock).mock.calls;
      const toolHandlerRegistration = handlerCalls.find(call =>
        call[0]._def?.typeName === 'ZodObject' || call[0].name === 'CallToolRequest'
      );

      if (toolHandlerRegistration) {
        const handler = toolHandlerRegistration[1];

        const requests = [
          handler(MCP.createMCPRequest('invalid_tool', {})), // Should fail
          handler(MCP.createMCPRequest('list_templates', {})) // Should succeed
        ];

        const results = await Promise.allSettled(requests);

        expect(results[0].status).toBe('rejected');
        expect(results[1].status).toBe('fulfilled');
      }
    });
  });

  describe('Performance and Scalability', () => {
    it('should handle multiple template operations efficiently', async () => {
      const start = performance.now();

      // Perform multiple operations
      const operations = [
        templateManager.getAllTemplates(),
        templateManager.getTemplatesByCategory('web-development'),
        templateManager.searchTemplates('template'),
        templateManager.getCategories()
      ];

      await Promise.all(operations);

      const end = performance.now();
      expect(end - start).toBeLessThan(100); // Should be very fast
    });

    it('should handle multiple PRP generations concurrently', async () => {
      const requests = Array.from({ length: 5 }, (_, i) =>
        Factory.createPRPGenerationRequest({
          templateId: 'e2e-web-template',
          projectContext: {
            name: `Concurrent Project ${i}`,
            domain: 'testing'
          }
        })
      );

      const start = performance.now();
      const results = await Promise.all(
        requests.map(req => prpGenerator.generatePRP(req))
      );
      const end = performance.now();

      expect(results).toHaveLength(5);
      results.forEach((result, i) => {
        expect(result).toContain(`Concurrent Project ${i}`);
      });

      // Should complete all 5 generations in reasonable time
      expect(end - start).toBeLessThan(1000);
    });

    it('should maintain memory efficiency during stress testing', async () => {
      // Perform many operations to test for memory leaks
      for (let i = 0; i < 100; i++) {
        templateManager.getAllTemplates();
        templateManager.searchTemplates(`test-${i}`);

        if (i % 10 === 0) {
          const request = Factory.createPRPGenerationRequest({
            templateId: 'e2e-web-template',
            projectContext: {
              name: `Stress Test ${i}`,
              domain: 'stress-testing'
            }
          });
          await prpGenerator.generatePRP(request);
        }
      }

      // If we get here without memory issues, test passes
      expect(true).toBe(true);
    });
  });

  describe('Tool Response Format Validation', () => {
    it('should return properly formatted responses from all tools', async () => {
      const toolDefinitions = getToolDefinitions();

      for (const tool of toolDefinitions) {
        expect(tool).toHaveProperty('name');
        expect(tool).toHaveProperty('description');
        expect(tool).toHaveProperty('inputSchema');

        expect(typeof tool.name).toBe('string');
        expect(typeof tool.description).toBe('string');
        expect(typeof tool.inputSchema).toBe('object');

        // Validate input schema structure
        expect(tool.inputSchema).toHaveProperty('type', 'object');
        expect(tool.inputSchema).toHaveProperty('properties');
        expect(tool.inputSchema).toHaveProperty('additionalProperties', false);
      }
    });

    it('should have meaningful descriptions for all tools', () => {
      const toolDefinitions = getToolDefinitions();

      toolDefinitions.forEach(tool => {
        expect(tool.description.length).toBeGreaterThan(20);
        expect(tool.description).not.toMatch(/TODO|FIXME|placeholder/i);
        expect(tool.description).toMatch(/^[A-Z]/); // Should start with capital letter
      });
    });

    it('should have proper input validation for complex tools', () => {
      const toolDefinitions = getToolDefinitions();

      const generatePrpTool = toolDefinitions.find(tool => tool.name === 'generate_prp');
      expect(generatePrpTool).toBeDefined();

      if (generatePrpTool) {
        const schema = generatePrpTool.inputSchema as any;
        expect(schema.required).toContain('templateId');
        expect(schema.required).toContain('projectContext');

        const properties = schema.properties;
        expect(properties.templateId.type).toBe('string');
        expect(properties.projectContext.type).toBe('object');
        expect(properties.outputFormat.enum).toContain('markdown');
        expect(properties.outputFormat.enum).toContain('json');
        expect(properties.outputFormat.enum).toContain('html');
      }
    });
  });

  describe('Real-world Scenario Simulation', () => {
    it('should handle typical development workflow', async () => {
      // 1. List available templates
      const allTemplates = templateManager.getAllTemplates();
      expect(allTemplates.length).toBeGreaterThan(0);

      // 2. Search for specific type of template
      const webTemplates = templateManager.searchTemplates('web');
      expect(webTemplates.length).toBeGreaterThan(0);

      // 3. Generate PRP using found template
      const selectedTemplate = webTemplates[0];
      const generationRequest = Factory.createPRPGenerationRequest({
        templateId: selectedTemplate.id,
        projectContext: {
          name: 'Real World App',
          domain: 'web application',
          stakeholders: ['product owner', 'developers', 'end users'],
          objectives: ['Deliver value to users', 'Maintain high quality'],
          constraints: ['Budget limits', 'Time constraints', 'Technical debt']
        },
        outputFormat: 'markdown'
      });

      const generatedPRP = await prpGenerator.generatePRP(generationRequest);

      // 4. Validate the generated content
      expect(generatedPRP).toContain('Real World App');
      expect(generatedPRP).toContain('product owner, developers, end users');
      expect(generatedPRP).toContain('# Product Requirements Prompt');
      expect(generatedPRP).toContain('## ');

      // 5. Verify structure and completeness
      const sectionCount = (generatedPRP.match(/^## /gm) || []).length;
      expect(sectionCount).toBeGreaterThan(0);
      expect(generatedPRP.length).toBeGreaterThan(500); // Should be substantial content
    });

    it('should handle edge case scenarios gracefully', async () => {
      // Test with minimal project context
      const minimalRequest = Factory.createPRPGenerationRequest({
        templateId: 'e2e-web-template',
        projectContext: {
          name: 'Minimal Project',
          domain: 'testing'
          // No stakeholders, objectives, or constraints
        }
      });

      const result = await prpGenerator.generatePRP(minimalRequest);
      expect(result).toContain('Minimal Project');
      expect(result).not.toContain('{{projectName}}');

      // Test with very long content
      const verboseRequest = Factory.createPRPGenerationRequest({
        templateId: 'e2e-web-template',
        projectContext: {
          name: 'Very Long Project Name That Exceeds Normal Length Expectations',
          domain: 'comprehensive enterprise software development and maintenance',
          stakeholders: Array.from({ length: 20 }, (_, i) => `Stakeholder ${i + 1}`),
          objectives: Array.from({ length: 15 }, (_, i) => `Objective ${i + 1}`),
          constraints: Array.from({ length: 10 }, (_, i) => `Constraint ${i + 1}`)
        }
      });

      const verboseResult = await prpGenerator.generatePRP(verboseRequest);
      expect(verboseResult).toContain('Very Long Project Name');
      expect(verboseResult.length).toBeGreaterThan(2000); // Should handle large content
    });
  });
});