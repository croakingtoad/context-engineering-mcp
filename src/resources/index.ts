import {
  ReadResourceRequestSchema,
  ListResourcesRequestSchema,
  McpError,
  ErrorCode
} from '@modelcontextprotocol/sdk/types.js';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';

/**
 * Register all MCP resources with the server
 */
export function registerResources(server: Server): void {
  // List available resources
  server.setRequestHandler(ListResourcesRequestSchema, async () => {
    return {
      resources: [
        {
          uri: 'context-engineering://templates',
          name: 'PRP Templates',
          description: 'Collection of Product Requirements Prompt templates',
          mimeType: 'application/json',
        },
        {
          uri: 'context-engineering://methodologies',
          name: 'Context Engineering Methodologies',
          description: 'Available context engineering methodologies and workflows',
          mimeType: 'application/json',
        },
        {
          uri: 'context-engineering://examples',
          name: 'PRP Examples',
          description: 'Example Product Requirements Prompts from Cole Medin\'s methodology',
          mimeType: 'text/markdown',
        },
        {
          uri: 'context-engineering://best-practices',
          name: 'Best Practices Guide',
          description: 'Context engineering best practices and guidelines',
          mimeType: 'text/markdown',
        },
        {
          uri: 'context-engineering://workflows',
          name: 'Interactive Workflows',
          description: 'Step-by-step workflows for creating comprehensive PRPs',
          mimeType: 'application/json',
        },
      ],
    };
  });

  // Read specific resources
  server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
    const { uri } = request.params;

    switch (uri) {
      case 'context-engineering://templates':
        // Will be implemented to return all templates
        return {
          contents: [
            {
              uri,
              mimeType: 'application/json',
              text: JSON.stringify({ message: 'Templates resource - to be implemented' }),
            },
          ],
        };

      case 'context-engineering://methodologies':
        // Will be implemented to return methodologies
        return {
          contents: [
            {
              uri,
              mimeType: 'application/json',
              text: JSON.stringify({ message: 'Methodologies resource - to be implemented' }),
            },
          ],
        };

      case 'context-engineering://examples':
        // Will be implemented to return examples
        return {
          contents: [
            {
              uri,
              mimeType: 'text/markdown',
              text: '# PRP Examples\n\nTo be implemented - examples from Cole Medin\'s methodology',
            },
          ],
        };

      case 'context-engineering://best-practices':
        // Will be implemented to return best practices
        return {
          contents: [
            {
              uri,
              mimeType: 'text/markdown',
              text: '# Context Engineering Best Practices\n\nTo be implemented',
            },
          ],
        };

      case 'context-engineering://workflows':
        // Will be implemented to return workflows
        return {
          contents: [
            {
              uri,
              mimeType: 'application/json',
              text: JSON.stringify({ message: 'Workflows resource - to be implemented' }),
            },
          ],
        };

      default:
        throw new McpError(ErrorCode.InvalidRequest, `Unknown resource: ${uri}`);
    }
  });
}