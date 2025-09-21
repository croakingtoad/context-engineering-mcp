import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';

// Import our tool and resource registrations
import { registerTools, getToolDefinitions } from './tools/index.js';
import { registerResources, setResourceDependencies } from './resources/index.js';

// Import core functionality
import { TemplateManager } from './lib/template-manager.js';
import { PRPGenerator } from './lib/prp-generator.js';
import { StorageSystem } from './lib/storage.js';
import { ChangeTracker } from './lib/change-tracker.js';
import { IntegrationsManager } from './lib/integrations.js';

// Import tool dependency setters
import { setStorageDependencies as setListPRPsDeps } from './tools/list-prps.js';
import { setStorageDependencies as setUpdatePRPDeps } from './tools/update-prp.js';
import { setStorageDependencies as setManageStorageDeps } from './tools/manage-storage.js';
import { setPRPGeneratorDependencies } from './tools/generate-prp.js';

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
let storageSystem: StorageSystem;
let changeTracker: ChangeTracker;
let integrationsManager: IntegrationsManager;

/**
 * Initialize the MCP server and its services
 */
async function initializeServer(): Promise<void> {
  try {
    // Initialize paths
    const templatesDir = process.env.TEMPLATES_DIR || './templates';
    const externalTemplatesDir = process.env.EXTERNAL_TEMPLATES_DIR || './external/context-engineering-intro';
    const dataDir = process.env.DATA_DIR || './data';

    // Initialize storage system
    storageSystem = new StorageSystem({
      baseDir: dataDir,
      enableLocking: true,
      maxConcurrentOperations: 10,
    });
    await storageSystem.initialize();
    // Storage system initialized

    // Initialize change tracker
    changeTracker = new ChangeTracker({
      baseDir: dataDir,
      maxVersionHistory: 50,
      enableDiffGeneration: true,
    });
    await changeTracker.initialize();
    // Change tracker initialized

    // Initialize integrations manager
    integrationsManager = new IntegrationsManager(storageSystem, {
      archonEnabled: true,
      archonHealthCheckInterval: 30000,
      fallbackToLocal: true,
    });
    await integrationsManager.initialize();
    // Integrations manager initialized

    // Initialize template manager
    templateManager = new TemplateManager(templatesDir, externalTemplatesDir);
    await templateManager.initialize();
    // Template manager initialized

    // Initialize PRP generator
    prpGenerator = new PRPGenerator(templateManager);
    // PRP generator initialized

    // Set dependencies for storage tools
    setListPRPsDeps(storageSystem, integrationsManager);
    setUpdatePRPDeps(storageSystem, integrationsManager, changeTracker);
    setManageStorageDeps(storageSystem, integrationsManager, changeTracker);
    // Placeholder implementations for missing services
    const prpValidator = new (await import('./lib/prp-validator.js')).PRPValidator();
    const executionGuidance = new (await import('./lib/execution-guidance.js')).ExecutionGuidance();

    setPRPGeneratorDependencies(prpGenerator, prpValidator, executionGuidance, storageSystem, integrationsManager, changeTracker);
    

    // Set dependencies for resource handlers
    setResourceDependencies(templateManager);
    

    
  } catch (error) {
    
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
  
  if (integrationsManager) {
    await integrationsManager.shutdown();
  }
  await server.close();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  
  if (integrationsManager) {
    await integrationsManager.shutdown();
  }
  await server.close();
  process.exit(0);
});

process.on('uncaughtException', (error) => {
  
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  
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

  
}

// Export for testing and external use
export {
  server,
  templateManager,
  prpGenerator,
  storageSystem,
  changeTracker,
  integrationsManager
};

// Start server if this file is run directly
if (process.argv[1] && process.argv[1].endsWith('index.js')) {
  startServer().catch((error) => {
    
    process.exit(1);
  });
}