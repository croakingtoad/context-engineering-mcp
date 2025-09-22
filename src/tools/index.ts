import {
  McpError,
  ErrorCode,
  CallToolRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { z } from 'zod';

// Import individual tools (will be created)
import { listTemplatesToolHandler } from './list-templates.js';
import { generatePRPToolHandler } from './generate-prp.js';
import { validatePRPToolHandler } from './validate-prp.js';
import { searchTemplatesToolHandler } from './search-templates.js';
import { createCustomTemplateToolHandler } from './create-custom-template.js';
import { analyzeContextToolHandler } from './analyze-context.js';

// Import storage tools
import { listPRPsToolHandler, getListPRPsToolDefinition } from './list-prps.js';
import {
  updatePRPToolHandler,
  getUpdatePRPToolDefinition,
} from './update-prp.js';
import {
  manageStorageToolHandler,
  getManageStorageToolDefinition,
} from './manage-storage.js';

/**
 * Register all MCP tools with the server
 */
export function registerTools(server: Server): void {
  // Tool 1: List Available Templates
  server.setRequestHandler(CallToolRequestSchema, async request => {
    const { name, arguments: args } = request.params;

    try {
      switch (name) {
        case 'list_templates':
          return await listTemplatesToolHandler(args);

        case 'generate_prp':
          return await generatePRPToolHandler(args);

        case 'validate_prp':
          return await validatePRPToolHandler(args);

        case 'search_templates':
          return await searchTemplatesToolHandler(args);

        case 'create_custom_template':
          return await createCustomTemplateToolHandler(args);

        case 'analyze_context':
          return await analyzeContextToolHandler(args);

        case 'list_prps':
          return await listPRPsToolHandler(args);

        case 'update_prp':
          return await updatePRPToolHandler(args);

        case 'manage_storage':
          return await manageStorageToolHandler(args);

        default:
          throw new McpError(ErrorCode.MethodNotFound, `Unknown tool: ${name}`);
      }
    } catch (error) {
      if (error instanceof McpError) {
        throw error;
      }

      // Handle validation errors
      if (error instanceof z.ZodError) {
        throw new McpError(
          ErrorCode.InvalidParams,
          `Invalid parameters: ${error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ')}`
        );
      }

      // Handle other errors
      throw new McpError(
        ErrorCode.InternalError,
        error instanceof Error ? error.message : 'Unknown error occurred'
      );
    }
  });
}

/**
 * Get tool definitions for the server
 */
export function getToolDefinitions(): Array<{
  name: string;
  description: string;
  inputSchema: object;
}> {
  return [
    {
      name: 'list_templates',
      description:
        'List all available PRP templates with optional filtering by category',
      inputSchema: {
        type: 'object',
        properties: {
          category: {
            type: 'string',
            description: 'Optional category to filter templates',
          },
        },
        additionalProperties: false,
      },
    },
    {
      name: 'generate_prp',
      description:
        'Generate a Product Requirements Prompt based on a template and project context with storage integration',
      inputSchema: {
        type: 'object',
        properties: {
          templateId: {
            type: 'string',
            description: 'ID of the template to use for generation',
          },
          projectContext: {
            type: 'object',
            description: 'Context information about the project',
            properties: {
              name: { type: 'string', description: 'Project name' },
              domain: {
                type: 'string',
                description: 'Project domain/industry',
              },
              stakeholders: {
                type: 'array',
                items: { type: 'string' },
                description: 'List of project stakeholders',
              },
              constraints: {
                type: 'array',
                items: { type: 'string' },
                description: 'Project constraints and limitations',
              },
              objectives: {
                type: 'array',
                items: { type: 'string' },
                description: 'Project objectives and goals',
              },
            },
            required: ['name', 'domain'],
            additionalProperties: false,
          },
          customSections: {
            type: 'array',
            description: 'Optional custom sections to add to the PRP',
            items: {
              type: 'object',
              properties: {
                title: { type: 'string' },
                content: { type: 'string' },
                examples: { type: 'array', items: { type: 'string' } },
                requirements: { type: 'array', items: { type: 'string' } },
              },
              required: ['title', 'content'],
            },
          },
          outputFormat: {
            type: 'string',
            enum: ['markdown', 'json', 'html'],
            description: 'Output format for the generated PRP',
            default: 'markdown',
          },
          saveToStorage: {
            type: 'boolean',
            default: true,
            description: 'Whether to save the generated PRP to storage',
          },
          filename: {
            type: 'string',
            description: 'Custom filename for the generated PRP',
          },
          saveToArchon: {
            type: 'boolean',
            default: false,
            description: 'Whether to save to Archon if available',
          },
          createTasks: {
            type: 'boolean',
            default: false,
            description: 'Whether to create Archon tasks from PRP sections',
          },
          projectId: {
            type: 'string',
            description: 'Project ID for Archon integration',
          },
          author: {
            type: 'string',
            description: 'Author of the generated PRP',
          },
          tags: {
            type: 'array',
            items: { type: 'string' },
            description: 'Tags for the generated PRP',
          },
          category: {
            type: 'string',
            default: 'prp',
            description: 'Category for the generated PRP',
          },
        },
        required: ['templateId', 'projectContext'],
        additionalProperties: false,
      },
    },
    {
      name: 'validate_prp',
      description: 'Validate a PRP against context engineering best practices',
      inputSchema: {
        type: 'object',
        properties: {
          prpContent: {
            type: 'string',
            description: 'The PRP content to validate',
          },
          templateId: {
            type: 'string',
            description: 'Optional template ID to validate against',
          },
        },
        required: ['prpContent'],
        additionalProperties: false,
      },
    },
    {
      name: 'search_templates',
      description: 'Search for templates by name, description, or tags',
      inputSchema: {
        type: 'object',
        properties: {
          query: {
            type: 'string',
            description: 'Search query string',
          },
          category: {
            type: 'string',
            description: 'Optional category filter',
          },
        },
        required: ['query'],
        additionalProperties: false,
      },
    },
    {
      name: 'create_custom_template',
      description: 'Create a new custom PRP template',
      inputSchema: {
        type: 'object',
        properties: {
          name: {
            type: 'string',
            description: 'Template name',
          },
          description: {
            type: 'string',
            description: 'Template description',
          },
          category: {
            type: 'string',
            description: 'Template category',
          },
          sections: {
            type: 'array',
            description: 'Template sections',
            items: {
              type: 'object',
              properties: {
                title: { type: 'string' },
                content: { type: 'string' },
                examples: { type: 'array', items: { type: 'string' } },
                requirements: { type: 'array', items: { type: 'string' } },
              },
              required: ['title', 'content'],
            },
          },
          tags: {
            type: 'array',
            items: { type: 'string' },
            description: 'Template tags for categorization',
          },
        },
        required: ['name', 'description', 'category', 'sections'],
        additionalProperties: false,
      },
    },
    {
      name: 'analyze_context',
      description:
        'Analyze project context to recommend suitable templates and improvements',
      inputSchema: {
        type: 'object',
        properties: {
          projectContext: {
            type: 'object',
            description: 'Project context to analyze',
            properties: {
              name: { type: 'string' },
              domain: { type: 'string' },
              description: { type: 'string' },
              stakeholders: { type: 'array', items: { type: 'string' } },
              constraints: { type: 'array', items: { type: 'string' } },
              objectives: { type: 'array', items: { type: 'string' } },
              existingRequirements: { type: 'string' },
            },
            required: ['name', 'domain'],
            additionalProperties: true,
          },
        },
        required: ['projectContext'],
        additionalProperties: false,
      },
    },
    // Add storage tool definitions
    getListPRPsToolDefinition(),
    getUpdatePRPToolDefinition(),
    getManageStorageToolDefinition(),
  ];
}
