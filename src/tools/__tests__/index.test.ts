/**
 * Unit tests for tools index and registration system
 */

import { registerTools, getToolDefinitions } from '../index';
import { MockImplementations } from '../../../test/test-helpers/index';
import { McpError, ErrorCode, CallToolRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';

// Mock all tool handlers
jest.mock('../list-templates', () => ({
  listTemplatesToolHandler: jest.fn()
}));
jest.mock('../generate-prp', () => ({
  generatePRPToolHandler: jest.fn()
}));
jest.mock('../validate-prp', () => ({
  validatePRPToolHandler: jest.fn()
}));
jest.mock('../search-templates', () => ({
  searchTemplatesToolHandler: jest.fn()
}));
jest.mock('../create-custom-template', () => ({
  createCustomTemplateToolHandler: jest.fn()
}));
jest.mock('../analyze-context', () => ({
  analyzeContextToolHandler: jest.fn()
}));
jest.mock('../list-prps', () => ({
  listPRPsToolHandler: jest.fn(),
  getListPRPsToolDefinition: jest.fn().mockReturnValue({
    name: 'list_prps',
    description: 'List stored PRPs',
    inputSchema: { type: 'object', properties: {} }
  })
}));
jest.mock('../update-prp', () => ({
  updatePRPToolHandler: jest.fn(),
  getUpdatePRPToolDefinition: jest.fn().mockReturnValue({
    name: 'update_prp',
    description: 'Update stored PRP',
    inputSchema: { type: 'object', properties: {} }
  })
}));
jest.mock('../manage-storage', () => ({
  manageStorageToolHandler: jest.fn(),
  getManageStorageToolDefinition: jest.fn().mockReturnValue({
    name: 'manage_storage',
    description: 'Manage storage system',
    inputSchema: { type: 'object', properties: {} }
  })
}));

describe('Tools Registration System', () => {
  let mockServer: any;
  let registeredHandler: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    mockServer = MockImplementations.createMockMCPServer();
    registeredHandler = jest.fn();

    // Mock the server's setRequestHandler to capture the handler
    mockServer.setRequestHandler.mockImplementation((schema, handler) => {
      registeredHandler = handler;
    });
  });

  describe('registerTools', () => {
    it('should register tool handler with server', () => {
      registerTools(mockServer);

      expect(mockServer.setRequestHandler).toHaveBeenCalledWith(
        CallToolRequestSchema,
        expect.any(Function)
      );
      expect(mockServer.setRequestHandler).toHaveBeenCalledTimes(1);
    });

    it('should handle list_templates tool calls', async () => {
      const { listTemplatesToolHandler } = require('../list-templates');
      listTemplatesToolHandler.mockResolvedValue({ result: 'templates listed' });

      registerTools(mockServer);

      const request = {
        params: {
          name: 'list_templates',
          arguments: { category: 'web-development' }
        }
      };

      const result = await registeredHandler(request);

      expect(listTemplatesToolHandler).toHaveBeenCalledWith({ category: 'web-development' });
      expect(result).toEqual({ result: 'templates listed' });
    });

    it('should handle generate_prp tool calls', async () => {
      const { generatePRPToolHandler } = require('../generate-prp');
      generatePRPToolHandler.mockResolvedValue({ content: 'Generated PRP' });

      registerTools(mockServer);

      const request = {
        params: {
          name: 'generate_prp',
          arguments: {
            templateId: 'test-template',
            projectContext: { name: 'Test', domain: 'test' }
          }
        }
      };

      const result = await registeredHandler(request);

      expect(generatePRPToolHandler).toHaveBeenCalledWith({
        templateId: 'test-template',
        projectContext: { name: 'Test', domain: 'test' }
      });
      expect(result).toEqual({ content: 'Generated PRP' });
    });

    it('should handle validate_prp tool calls', async () => {
      const { validatePRPToolHandler } = require('../validate-prp');
      validatePRPToolHandler.mockResolvedValue({ isValid: true, score: 95 });

      registerTools(mockServer);

      const request = {
        params: {
          name: 'validate_prp',
          arguments: { prpContent: 'Test PRP content' }
        }
      };

      const result = await registeredHandler(request);

      expect(validatePRPToolHandler).toHaveBeenCalledWith({ prpContent: 'Test PRP content' });
      expect(result).toEqual({ isValid: true, score: 95 });
    });

    it('should handle search_templates tool calls', async () => {
      const { searchTemplatesToolHandler } = require('../search-templates');
      searchTemplatesToolHandler.mockResolvedValue({ templates: [] });

      registerTools(mockServer);

      const request = {
        params: {
          name: 'search_templates',
          arguments: { query: 'react' }
        }
      };

      const result = await registeredHandler(request);

      expect(searchTemplatesToolHandler).toHaveBeenCalledWith({ query: 'react' });
      expect(result).toEqual({ templates: [] });
    });

    it('should handle create_custom_template tool calls', async () => {
      const { createCustomTemplateToolHandler } = require('../create-custom-template');
      createCustomTemplateToolHandler.mockResolvedValue({ created: true });

      registerTools(mockServer);

      const request = {
        params: {
          name: 'create_custom_template',
          arguments: {
            name: 'Custom Template',
            category: 'custom',
            sections: []
          }
        }
      };

      const result = await registeredHandler(request);

      expect(createCustomTemplateToolHandler).toHaveBeenCalledWith({
        name: 'Custom Template',
        category: 'custom',
        sections: []
      });
      expect(result).toEqual({ created: true });
    });

    it('should handle analyze_context tool calls', async () => {
      const { analyzeContextToolHandler } = require('../analyze-context');
      analyzeContextToolHandler.mockResolvedValue({ analysis: 'complete' });

      registerTools(mockServer);

      const request = {
        params: {
          name: 'analyze_context',
          arguments: {
            projectContext: { name: 'Test', domain: 'test' }
          }
        }
      };

      const result = await registeredHandler(request);

      expect(analyzeContextToolHandler).toHaveBeenCalledWith({
        projectContext: { name: 'Test', domain: 'test' }
      });
      expect(result).toEqual({ analysis: 'complete' });
    });

    it('should handle storage tool calls', async () => {
      const { listPRPsToolHandler } = require('../list-prps');
      const { updatePRPToolHandler } = require('../update-prp');
      const { manageStorageToolHandler } = require('../manage-storage');

      listPRPsToolHandler.mockResolvedValue({ prps: [] });
      updatePRPToolHandler.mockResolvedValue({ updated: true });
      manageStorageToolHandler.mockResolvedValue({ managed: true });

      registerTools(mockServer);

      // Test list_prps
      let result = await registeredHandler({
        params: { name: 'list_prps', arguments: {} }
      });
      expect(result).toEqual({ prps: [] });

      // Test update_prp
      result = await registeredHandler({
        params: { name: 'update_prp', arguments: { id: 'test' } }
      });
      expect(result).toEqual({ updated: true });

      // Test manage_storage
      result = await registeredHandler({
        params: { name: 'manage_storage', arguments: { action: 'clean' } }
      });
      expect(result).toEqual({ managed: true });
    });

    it('should throw MethodNotFound error for unknown tools', async () => {
      registerTools(mockServer);

      const request = {
        params: {
          name: 'unknown_tool',
          arguments: {}
        }
      };

      await expect(registeredHandler(request))
        .rejects
        .toThrow(new McpError(ErrorCode.MethodNotFound, 'Unknown tool: unknown_tool'));
    });

    it('should propagate McpError from tool handlers', async () => {
      const { listTemplatesToolHandler } = require('../list-templates');
      const originalError = new McpError(ErrorCode.InvalidParams, 'Invalid template category');
      listTemplatesToolHandler.mockRejectedValue(originalError);

      registerTools(mockServer);

      const request = {
        params: {
          name: 'list_templates',
          arguments: { category: 'invalid' }
        }
      };

      await expect(registeredHandler(request))
        .rejects
        .toThrow(originalError);
    });

    it('should convert Zod validation errors to McpError', async () => {
      const { generatePRPToolHandler } = require('../generate-prp');
      const zodError = new z.ZodError([
        { code: 'invalid_type', expected: 'string', received: 'number', path: ['templateId'], message: 'Expected string' }
      ]);
      generatePRPToolHandler.mockRejectedValue(zodError);

      registerTools(mockServer);

      const request = {
        params: {
          name: 'generate_prp',
          arguments: { templateId: 123 } // Invalid type
        }
      };

      await expect(registeredHandler(request))
        .rejects
        .toThrow(new McpError(ErrorCode.InvalidParams, 'Invalid parameters: templateId: Expected string'));
    });

    it('should wrap generic errors in InternalError McpError', async () => {
      const { listTemplatesToolHandler } = require('../list-templates');
      const genericError = new Error('Database connection failed');
      listTemplatesToolHandler.mockRejectedValue(genericError);

      registerTools(mockServer);

      const request = {
        params: {
          name: 'list_templates',
          arguments: {}
        }
      };

      await expect(registeredHandler(request))
        .rejects
        .toThrow(new McpError(ErrorCode.InternalError, 'Database connection failed'));
    });

    it('should handle non-Error exceptions', async () => {
      const { searchTemplatesToolHandler } = require('../search-templates');
      searchTemplatesToolHandler.mockRejectedValue('String error');

      registerTools(mockServer);

      const request = {
        params: {
          name: 'search_templates',
          arguments: { query: 'test' }
        }
      };

      await expect(registeredHandler(request))
        .rejects
        .toThrow(new McpError(ErrorCode.InternalError, 'Unknown error occurred'));
    });
  });

  describe('getToolDefinitions', () => {
    it('should return array of tool definitions', () => {
      const definitions = getToolDefinitions();

      expect(Array.isArray(definitions)).toBe(true);
      expect(definitions.length).toBeGreaterThan(0);

      // Check that each definition has required properties
      definitions.forEach(def => {
        expect(def).toHaveProperty('name');
        expect(def).toHaveProperty('description');
        expect(def).toHaveProperty('inputSchema');
        expect(typeof def.name).toBe('string');
        expect(typeof def.description).toBe('string');
        expect(typeof def.inputSchema).toBe('object');
      });
    });

    it('should include all core tool definitions', () => {
      const definitions = getToolDefinitions();
      const toolNames = definitions.map(def => def.name);

      const expectedTools = [
        'list_templates',
        'generate_prp',
        'validate_prp',
        'search_templates',
        'create_custom_template',
        'analyze_context',
        'list_prps',
        'update_prp',
        'manage_storage'
      ];

      expectedTools.forEach(toolName => {
        expect(toolNames).toContain(toolName);
      });
    });

    it('should have valid input schemas for each tool', () => {
      const definitions = getToolDefinitions();

      definitions.forEach(def => {
        expect(def.inputSchema).toHaveProperty('type', 'object');
        expect(def.inputSchema).toHaveProperty('properties');
        expect(def.inputSchema).toHaveProperty('additionalProperties', false);

        if (def.inputSchema.required) {
          expect(Array.isArray(def.inputSchema.required)).toBe(true);
        }
      });
    });

    it('should include storage tool definitions from imports', () => {
      const definitions = getToolDefinitions();
      const storageTools = definitions.filter(def =>
        ['list_prps', 'update_prp', 'manage_storage'].includes(def.name)
      );

      expect(storageTools).toHaveLength(3);

      // Verify the mock definitions are included
      const listPrpsDefinition = storageTools.find(def => def.name === 'list_prps');
      expect(listPrpsDefinition?.description).toBe('List stored PRPs');

      const updatePrpDefinition = storageTools.find(def => def.name === 'update_prp');
      expect(updatePrpDefinition?.description).toBe('Update stored PRP');

      const manageStorageDefinition = storageTools.find(def => def.name === 'manage_storage');
      expect(manageStorageDefinition?.description).toBe('Manage storage system');
    });

    it('should have specific input schema for list_templates', () => {
      const definitions = getToolDefinitions();
      const listTemplatesDef = definitions.find(def => def.name === 'list_templates');

      expect(listTemplatesDef).toBeDefined();
      expect(listTemplatesDef?.inputSchema.properties).toHaveProperty('category');
      expect(listTemplatesDef?.inputSchema.properties.category.type).toBe('string');
    });

    it('should have specific input schema for generate_prp', () => {
      const definitions = getToolDefinitions();
      const generatePrpDef = definitions.find(def => def.name === 'generate_prp');

      expect(generatePrpDef).toBeDefined();
      expect(generatePrpDef?.inputSchema.properties).toHaveProperty('templateId');
      expect(generatePrpDef?.inputSchema.properties).toHaveProperty('projectContext');
      expect(generatePrpDef?.inputSchema.required).toContain('templateId');
      expect(generatePrpDef?.inputSchema.required).toContain('projectContext');
    });

    it('should have specific input schema for validate_prp', () => {
      const definitions = getToolDefinitions();
      const validatePrpDef = definitions.find(def => def.name === 'validate_prp');

      expect(validatePrpDef).toBeDefined();
      expect(validatePrpDef?.inputSchema.properties).toHaveProperty('prpContent');
      expect(validatePrpDef?.inputSchema.required).toContain('prpContent');
    });

    it('should have specific input schema for search_templates', () => {
      const definitions = getToolDefinitions();
      const searchDef = definitions.find(def => def.name === 'search_templates');

      expect(searchDef).toBeDefined();
      expect(searchDef?.inputSchema.properties).toHaveProperty('query');
      expect(searchDef?.inputSchema.required).toContain('query');
    });

    it('should have specific input schema for create_custom_template', () => {
      const definitions = getToolDefinitions();
      const createDef = definitions.find(def => def.name === 'create_custom_template');

      expect(createDef).toBeDefined();
      expect(createDef?.inputSchema.properties).toHaveProperty('name');
      expect(createDef?.inputSchema.properties).toHaveProperty('category');
      expect(createDef?.inputSchema.properties).toHaveProperty('sections');
      expect(createDef?.inputSchema.required).toContain('name');
      expect(createDef?.inputSchema.required).toContain('category');
      expect(createDef?.inputSchema.required).toContain('sections');
    });

    it('should have specific input schema for analyze_context', () => {
      const definitions = getToolDefinitions();
      const analyzeDef = definitions.find(def => def.name === 'analyze_context');

      expect(analyzeDef).toBeDefined();
      expect(analyzeDef?.inputSchema.properties).toHaveProperty('projectContext');
      expect(analyzeDef?.inputSchema.required).toContain('projectContext');
    });

    it('should return immutable definitions array', () => {
      const definitions1 = getToolDefinitions();
      const definitions2 = getToolDefinitions();

      // Should return new arrays each time
      expect(definitions1).not.toBe(definitions2);
      expect(definitions1).toEqual(definitions2);
    });

    it('should maintain consistent definition structure', () => {
      const definitions = getToolDefinitions();

      definitions.forEach((def, index) => {
        expect(def).toHaveValidStructure();

        // Test that schema is valid JSONSchema-like structure
        expect(def.inputSchema.type).toBe('object');
        expect(typeof def.inputSchema.properties).toBe('object');

        // Test description is meaningful
        expect(def.description.length).toBeGreaterThan(10);
        expect(def.description).not.toContain('TODO');
        expect(def.description).not.toContain('FIXME');
      });
    });
  });

  describe('Error Handling Integration', () => {
    it('should handle tool handler initialization errors', () => {
      // This test ensures the module loads even if some handlers are missing
      expect(() => {
        const definitions = getToolDefinitions();
        expect(definitions).toBeDefined();
      }).not.toThrow();
    });

    it('should handle concurrent tool executions', async () => {
      const { listTemplatesToolHandler } = require('../list-templates');
      const { searchTemplatesToolHandler } = require('../search-templates');

      listTemplatesToolHandler.mockResolvedValue({ templates: ['template1'] });
      searchTemplatesToolHandler.mockResolvedValue({ templates: ['template2'] });

      registerTools(mockServer);

      const requests = [
        registeredHandler({ params: { name: 'list_templates', arguments: {} } }),
        registeredHandler({ params: { name: 'search_templates', arguments: { query: 'test' } } }),
        registeredHandler({ params: { name: 'list_templates', arguments: {} } })
      ];

      const results = await Promise.all(requests);

      expect(results[0]).toEqual({ templates: ['template1'] });
      expect(results[1]).toEqual({ templates: ['template2'] });
      expect(results[2]).toEqual({ templates: ['template1'] });
    });

    it('should isolate errors between concurrent executions', async () => {
      const { listTemplatesToolHandler } = require('../list-templates');
      const { searchTemplatesToolHandler } = require('../search-templates');

      listTemplatesToolHandler.mockRejectedValue(new Error('Handler error'));
      searchTemplatesToolHandler.mockResolvedValue({ templates: ['template1'] });

      registerTools(mockServer);

      const requests = [
        registeredHandler({ params: { name: 'list_templates', arguments: {} } }),
        registeredHandler({ params: { name: 'search_templates', arguments: { query: 'test' } } })
      ];

      const results = await Promise.allSettled(requests);

      expect(results[0].status).toBe('rejected');
      expect(results[1].status).toBe('fulfilled');
      expect((results[1] as PromiseFulfilledResult<any>).value).toEqual({ templates: ['template1'] });
    });
  });
});