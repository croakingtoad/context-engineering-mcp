import {
  ReadResourceRequestSchema,
  ListResourcesRequestSchema,
  McpError,
  ErrorCode,
} from '@modelcontextprotocol/sdk/types.js';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { ResourceManager } from './resource-manager.js';
import { PRPResourceHandler } from './handlers/prp-handler.js';
import { InitialRequestHandler } from './handlers/initial-handler.js';
import { PatternsHandler } from './handlers/patterns-handler.js';
import { TemplateBaseHandler } from './handlers/template-base-handler.js';
import { RulesGlobalHandler } from './handlers/rules-global-handler.js';
import { TemplateManager } from '../lib/template-manager.js';

let resourceManager: ResourceManager;
let templateManager: TemplateManager;

/**
 * Set dependencies for resource handlers
 */
export function setResourceDependencies(tm: TemplateManager): void {
  templateManager = tm;
}

/**
 * Register all MCP resources with the server
 */
export function registerResources(server: Server): void {
  // Initialize the resource manager
  resourceManager = new ResourceManager();

  // Initialize handlers with appropriate dependencies
  const prpHandler = new PRPResourceHandler();
  const initialHandler = new InitialRequestHandler();
  const patternsHandler = new PatternsHandler();
  const templateHandler = new TemplateBaseHandler();
  const rulesHandler = new RulesGlobalHandler();

  // Initialize handlers
  Promise.all([
    prpHandler.initialize(),
    initialHandler.initialize(),
    templateHandler.initialize(),
    rulesHandler.initialize(),
  ]).catch(error => {
    console.warn('Failed to initialize some resource handlers:', error);
  });

  // Register resource handlers
  resourceManager.registerHandler('prps', prpHandler);
  resourceManager.registerHandler('initial', initialHandler);
  resourceManager.registerHandler('patterns', patternsHandler);
  resourceManager.registerHandler('templates', templateHandler);
  resourceManager.registerHandler('rules', rulesHandler);

  // List available resources
  server.setRequestHandler(ListResourcesRequestSchema, async () => {
    return {
      resources: await resourceManager.listResources(),
    };
  });

  // Read specific resources
  server.setRequestHandler(ReadResourceRequestSchema, async request => {
    const { uri } = request.params;

    try {
      const content = await resourceManager.readResource(uri);
      return {
        contents: [content],
      };
    } catch (error) {
      if (error instanceof McpError) {
        throw error;
      }

      // Convert other errors to MCP errors
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      throw new McpError(
        ErrorCode.InternalError,
        `Failed to read resource ${uri}: ${errorMessage}`
      );
    }
  });
}

// Export resource manager for testing and external use
export { resourceManager };
