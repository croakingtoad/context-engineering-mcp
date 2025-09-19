import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';

// Import our tool and resource registrations
import { registerTools, getToolDefinitions } from './tools/index.js';
import { registerResources } from './resources/index.js';

// Import core functionality
import { TemplateManager } from './lib/template-manager.js';
import { PRPGenerator } from './lib/prp-generator.js';

// Server configuration
const server = new Server(
  {
    name: 'context-engineering-mcp-server',
    version: '1.0.0',
  },
  {
    capabilities: {
      tools: {},
      resources: {},
    },
  }
);

// Initialize core services
let templateManager: TemplateManager;
let prpGenerator: PRPGenerator;

/**
 * Initialize the MCP server and its services
 */
async function initializeServer(): Promise<void> {
  try {
    // Initialize paths
    const templatesDir = process.env.TEMPLATES_DIR || './templates';
    const externalTemplatesDir = process.env.EXTERNAL_TEMPLATES_DIR || './external/context-engineering-intro';

    // Initialize template manager
    templateManager = new TemplateManager(templatesDir, externalTemplatesDir);
    await templateManager.initialize();

    // Initialize PRP generator
    prpGenerator = new PRPGenerator(templateManager);

    console.error('[Server] Context Engineering MCP Server initialized successfully');
  } catch (error) {
    console.error('[Server] Failed to initialize server:', error);
    process.exit(1);
  }
}

// Handle tool listing
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: getToolDefinitions(),
  };
});

// Register tools and resources
registerTools(server);
registerResources(server);

// Error handlers
process.on('SIGINT', async () => {
  console.error('[Server] Received SIGINT, shutting down gracefully...');
  await server.close();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.error('[Server] Received SIGTERM, shutting down gracefully...');
  await server.close();
  process.exit(0);
});

process.on('uncaughtException', (error) => {
  console.error('[Server] Uncaught exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('[Server] Unhandled rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

/**
 * Start the MCP server
 */
async function startServer(): Promise<void> {
  // Initialize server services
  await initializeServer();

  // Create transport and start server
  const transport = new StdioServerTransport();
  await server.connect(transport);

  console.error('[Server] Context Engineering MCP Server is running');
}

// Export for testing and external use
export { server, templateManager, prpGenerator };

// Start server if this file is run directly
if (process.argv[1] && process.argv[1].endsWith('index.js')) {
  startServer().catch((error) => {
    console.error('[Server] Failed to start server:', error);
    process.exit(1);
  });
}