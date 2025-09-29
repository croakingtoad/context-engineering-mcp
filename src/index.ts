import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  ListToolsRequestSchema,
  McpError,
  ErrorCode,
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
import { setTemplateManagerDependency } from './tools/list-templates.js';
import { setTemplateManagerDependency as setSearchTemplateManagerDependency } from './tools/search-templates.js';
import { setTemplateManagerDependency as setCreateTemplateManagerDependency } from './tools/create-custom-template.js';
import { setPRPValidatorDependency } from './tools/validate-prp.js';
import { setAnalyzeContextDependencies } from './tools/analyze-context.js';

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

    // Initialize change tracker
    changeTracker = new ChangeTracker({
      baseDir: dataDir,
      maxVersionHistory: 50,
      enableDiffGeneration: true,
    });
    await changeTracker.initialize();

    // Initialize integrations manager
    integrationsManager = new IntegrationsManager(storageSystem, {
      archonEnabled: true,
      archonHealthCheckInterval: 30000,
      fallbackToLocal: true,
    });
    await integrationsManager.initialize();

    // Initialize template manager
    templateManager = new TemplateManager(templatesDir, externalTemplatesDir);
    await templateManager.initialize();

    // Initialize PRP generator
    prpGenerator = new PRPGenerator(templateManager);

    // Initialize codebase analyzer
    const codebaseAnalyzer = new (await import('./lib/codebase-analyzer.js')).CodebaseAnalyzer();

    // Set template manager dependency for tools
    setTemplateManagerDependency(templateManager);
    setSearchTemplateManagerDependency(templateManager);
    setCreateTemplateManagerDependency(templateManager);

    // Set other tool dependencies
    const prpValidator = new (await import('./lib/prp-validator.js')).PRPValidator();
    setPRPValidatorDependency(prpValidator);
    setAnalyzeContextDependencies(codebaseAnalyzer, templateManager);

    // Set dependencies for storage tools
    setListPRPsDeps(storageSystem, integrationsManager);
    setUpdatePRPDeps(storageSystem, integrationsManager, changeTracker);
    setManageStorageDeps(storageSystem, integrationsManager, changeTracker);

    // Get existing prpValidator and executionGuidance (already created above)
    const executionGuidance = new (await import('./lib/execution-guidance.js')).ExecutionGuidance();

    setPRPGeneratorDependencies(prpGenerator, prpValidator, executionGuidance, storageSystem, integrationsManager, changeTracker);

    // Set dependencies for resource handlers
    setResourceDependencies(templateManager);

    // Register resources (must happen after dependencies are set)
    await registerResources(server);

    // Perform health checks on all critical services
    const healthChecks = [];

    if (!templateManager.isHealthy()) {
      healthChecks.push('Template manager has no templates loaded');
    }

    if (healthChecks.length > 0) {
      throw new McpError(
        ErrorCode.InternalError,
        'Server initialization failed health checks',
        {
          failures: healthChecks,
          templateDiagnostics: templateManager.getDiagnostics(),
        }
      );
    }
  } catch (error) {
    // If initialization fails, we must not let the server start
    throw new McpError(
      ErrorCode.InternalError,
      `Failed to initialize server: ${error instanceof Error ? error.message : 'Unknown error'}`,
      { originalError: error instanceof Error ? error.stack : String(error) }
    );
  }
}

// Handle tool listing
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: getToolDefinitions(),
  };
});

// Register tools
registerTools(server);

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
  // Write to stderr since stdout is used for JSON-RPC
  process.stderr.write(`Uncaught exception: ${error.message}\n${error.stack}\n`);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  // Write to stderr since stdout is used for JSON-RPC
  process.stderr.write(`Unhandled rejection: ${reason}\n`);
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
    process.stderr.write(`Failed to start server: ${error.message}\n${error.stack}\n`);
    process.exit(1);
  });
}