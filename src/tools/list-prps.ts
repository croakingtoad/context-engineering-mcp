import { z } from 'zod';
import { StorageSystem, SearchOptions } from '../lib/storage.js';
import { IntegrationsManager } from '../lib/integrations.js';

// Import singleton instances (will be set by main server)
let storageSystem: StorageSystem;
let integrationsManager: IntegrationsManager;

export function setStorageDependencies(
  storage: StorageSystem,
  integrations: IntegrationsManager
) {
  storageSystem = storage;
  integrationsManager = integrations;
}

// Input schema for list_prps tool
export const ListPRPsInputSchema = z.object({
  query: z
    .string()
    .optional()
    .describe('Search query to filter PRPs by name or tags'),
  category: z.string().optional().describe('Filter PRPs by category'),
  tags: z.array(z.string()).optional().describe('Filter PRPs by specific tags'),
  dateRange: z
    .object({
      from: z.string().describe('Start date in ISO format'),
      to: z.string().describe('End date in ISO format'),
    })
    .optional()
    .describe('Filter PRPs by date range'),
  sortBy: z
    .enum(['name', 'created', 'modified', 'size'])
    .default('modified')
    .describe('Field to sort by'),
  sortOrder: z.enum(['asc', 'desc']).default('desc').describe('Sort order'),
  limit: z
    .number()
    .min(1)
    .max(100)
    .default(20)
    .describe('Maximum number of PRPs to return'),
  offset: z.number().min(0).default(0).describe('Number of PRPs to skip'),
  includeStats: z
    .boolean()
    .default(false)
    .describe('Include storage statistics'),
  includeArchonStatus: z
    .boolean()
    .default(false)
    .describe('Include Archon integration status'),
});

export type ListPRPsInput = z.infer<typeof ListPRPsInputSchema>;

/**
 * List PRPs with advanced search and filter capabilities
 */
export async function listPRPsToolHandler(params: unknown) {
  try {
    const input = ListPRPsInputSchema.parse(params);

    if (!storageSystem) {
      throw new Error('Storage system not initialized');
    }

    // Convert search options
    const searchOptions: SearchOptions = {
      sortBy: input.sortBy,
      sortOrder: input.sortOrder,
      limit: input.limit,
      offset: input.offset,
    };

    if (input.query) {
      searchOptions.query = input.query;
    }
    if (input.category) {
      searchOptions.category = input.category;
    }
    if (input.tags) {
      searchOptions.tags = input.tags;
    }
    if (input.dateRange) {
      searchOptions.dateRange = {
        from: new Date(input.dateRange.from),
        to: new Date(input.dateRange.to),
      };
    }

    // Get PRPs from storage
    const { files, total, hasMore } =
      await storageSystem.listPRPs(searchOptions);

    const result: any = {
      prps: files.map(file => ({
        id: file.id,
        name: file.name,
        path: file.path,
        size: file.size,
        created: file.created.toISOString(),
        modified: file.modified.toISOString(),
        version: file.version,
        tags: file.tags,
        category: file.category,
        author: file.author,
        hash: file.hash,
      })),
      pagination: {
        total,
        offset: input.offset,
        limit: input.limit,
        hasMore,
      },
    };

    // Include storage statistics if requested
    if (input.includeStats) {
      const stats = await storageSystem.getStats();
      result.stats = stats;
    }

    // Include Archon integration status if requested
    if (input.includeArchonStatus && integrationsManager) {
      const healthStatus = integrationsManager.getHealthStatus();
      result.archonStatus = {
        available: integrationsManager.isArchonAvailable(),
        healthy: healthStatus.isHealthy,
        lastCheck: healthStatus.lastCheck.toISOString(),
        latency: healthStatus.latency,
        error: healthStatus.error,
        capabilities: healthStatus.capabilities,
      };
    }

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(result, null, 2),
        },
      ],
    };
  } catch (error) {
    return {
      content: [
        {
          type: 'text',
          text: `Error listing PRPs: ${error instanceof Error ? error.message : 'Unknown error'}`,
        },
      ],
      isError: true,
    };
  }
}

/**
 * Get the tool definition for list_prps
 */
export function getListPRPsToolDefinition() {
  return {
    name: 'list_prps',
    description:
      'List and search PRPs with advanced filtering and sorting capabilities',
    inputSchema: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'Search query to filter PRPs by name or tags',
        },
        category: {
          type: 'string',
          description: 'Filter PRPs by category',
        },
        tags: {
          type: 'array',
          items: { type: 'string' },
          description: 'Filter PRPs by specific tags',
        },
        dateRange: {
          type: 'object',
          properties: {
            from: { type: 'string', description: 'Start date in ISO format' },
            to: { type: 'string', description: 'End date in ISO format' },
          },
          required: ['from', 'to'],
          description: 'Filter PRPs by date range',
        },
        sortBy: {
          type: 'string',
          enum: ['name', 'created', 'modified', 'size'],
          default: 'modified',
          description: 'Field to sort by',
        },
        sortOrder: {
          type: 'string',
          enum: ['asc', 'desc'],
          default: 'desc',
          description: 'Sort order',
        },
        limit: {
          type: 'number',
          minimum: 1,
          maximum: 100,
          default: 20,
          description: 'Maximum number of PRPs to return',
        },
        offset: {
          type: 'number',
          minimum: 0,
          default: 0,
          description: 'Number of PRPs to skip',
        },
        includeStats: {
          type: 'boolean',
          default: false,
          description: 'Include storage statistics',
        },
        includeArchonStatus: {
          type: 'boolean',
          default: false,
          description: 'Include Archon integration status',
        },
      },
      additionalProperties: false,
    },
  };
}
