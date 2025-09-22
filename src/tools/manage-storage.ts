import { z } from 'zod';
import { StorageSystem } from '../lib/storage.js';
import { IntegrationsManager } from '../lib/integrations.js';
import { ChangeTracker } from '../lib/change-tracker.js';

// Import singleton instances (will be set by main server)
let storageSystem: StorageSystem;
let integrationsManager: IntegrationsManager;
let changeTracker: ChangeTracker;

export function setStorageDependencies(
  storage: StorageSystem,
  integrations: IntegrationsManager,
  tracker: ChangeTracker
) {
  storageSystem = storage;
  integrationsManager = integrations;
  changeTracker = tracker;
}

// Input schema for manage_storage tool
export const ManageStorageInputSchema = z.object({
  action: z
    .enum([
      'get_stats',
      'health_check',
      'get_change_history',
      'generate_diff',
      'rollback',
      'resolve_conflict',
      'get_audit_trail',
      'reconnect_archon',
      'delete_prp',
    ])
    .describe('Storage management action to perform'),

  // Parameters for different actions
  fileId: z
    .string()
    .optional()
    .describe('File ID for file-specific operations'),
  fromVersion: z
    .number()
    .optional()
    .describe('Starting version for diff/rollback operations'),
  toVersion: z
    .number()
    .optional()
    .describe('Target version for diff/rollback operations'),
  targetVersion: z.number().optional().describe('Target version for rollback'),
  diffFormat: z
    .enum(['unified', 'side-by-side', 'html'])
    .optional()
    .describe('Format for diff output'),
  rollbackReason: z.string().optional().describe('Reason for rollback'),
  preserveChanges: z
    .boolean()
    .optional()
    .describe('Whether to preserve changes during rollback'),
  createBackup: z
    .boolean()
    .default(true)
    .describe('Whether to create backup during operations'),

  // Conflict resolution parameters
  conflictId: z.string().optional().describe('Conflict ID for resolution'),
  resolutionStrategy: z
    .enum(['accept-current', 'accept-incoming', 'merge', 'manual'])
    .optional(),
  mergedContent: z
    .string()
    .optional()
    .describe('Manually merged content for conflict resolution'),
  resolvedBy: z.string().optional().describe('Person resolving the conflict'),

  // History and audit parameters
  historyLimit: z
    .number()
    .min(1)
    .max(100)
    .default(10)
    .describe('Number of history entries to return'),
  historyOffset: z
    .number()
    .min(0)
    .default(0)
    .describe('Offset for history pagination'),
  fromDate: z
    .string()
    .optional()
    .describe('Start date for audit trail (ISO format)'),
  toDate: z
    .string()
    .optional()
    .describe('End date for audit trail (ISO format)'),
  author: z.string().optional().describe('Filter by author'),
  changeType: z
    .enum(['create', 'update', 'delete', 'restore'])
    .optional()
    .describe('Filter by change type'),
});

export type ManageStorageInput = z.infer<typeof ManageStorageInputSchema>;

/**
 * Manage storage operations including versioning, conflicts, and integrations
 */
export async function manageStorageToolHandler(params: unknown) {
  try {
    const input = ManageStorageInputSchema.parse(params);

    if (!storageSystem) {
      throw new Error('Storage system not initialized');
    }

    switch (input.action) {
      case 'get_stats':
        return await handleGetStats();

      case 'health_check':
        return await handleHealthCheck();

      case 'get_change_history':
        if (!input.fileId) {
          throw new Error('fileId required for get_change_history action');
        }
        return await handleGetChangeHistory(input);

      case 'generate_diff':
        if (
          !input.fileId ||
          input.fromVersion === undefined ||
          input.toVersion === undefined
        ) {
          throw new Error(
            'fileId, fromVersion, and toVersion required for generate_diff action'
          );
        }
        return await handleGenerateDiff(input);

      case 'rollback':
        if (!input.fileId || input.targetVersion === undefined) {
          throw new Error(
            'fileId and targetVersion required for rollback action'
          );
        }
        return await handleRollback(input);

      case 'resolve_conflict':
        if (!input.conflictId || !input.resolutionStrategy) {
          throw new Error(
            'conflictId and resolutionStrategy required for resolve_conflict action'
          );
        }
        return await handleResolveConflict(input);

      case 'get_audit_trail':
        if (!input.fileId) {
          throw new Error('fileId required for get_audit_trail action');
        }
        return await handleGetAuditTrail(input);

      case 'reconnect_archon':
        return await handleReconnectArchon();

      case 'delete_prp':
        if (!input.fileId) {
          throw new Error('fileId required for delete_prp action');
        }
        return await handleDeletePRP(input);

      default:
        throw new Error(`Unknown action: ${input.action}`);
    }
  } catch (error) {
    return {
      content: [
        {
          type: 'text',
          text: `Error in storage management: ${error instanceof Error ? error.message : 'Unknown error'}`,
        },
      ],
      isError: true,
    };
  }
}

async function handleGetStats() {
  const stats = await storageSystem.getStats();

  let archonStatus = null;
  if (integrationsManager) {
    const healthStatus = integrationsManager.getHealthStatus();
    archonStatus = {
      available: integrationsManager.isArchonAvailable(),
      healthy: healthStatus.isHealthy,
      lastCheck: healthStatus.lastCheck.toISOString(),
      latency: healthStatus.latency,
      error: healthStatus.error,
      capabilities: healthStatus.capabilities,
    };
  }

  const result = {
    storage: {
      totalFiles: stats.totalFiles,
      totalSize: stats.totalSize,
      categories: stats.categories,
      lastModified: stats.lastModified?.toISOString(),
    },
    archon: archonStatus,
  };

  return {
    content: [
      {
        type: 'text',
        text: JSON.stringify(result, null, 2),
      },
    ],
  };
}

async function handleHealthCheck() {
  const storageHealthy = true; // Storage system is always considered healthy if initialized

  let archonHealth = null;
  if (integrationsManager) {
    const healthStatus = await integrationsManager.performHealthCheck();
    archonHealth = {
      available: integrationsManager.isArchonAvailable(),
      healthy: healthStatus.isHealthy,
      lastCheck: healthStatus.lastCheck.toISOString(),
      latency: healthStatus.latency,
      error: healthStatus.error,
      capabilities: healthStatus.capabilities,
    };
  }

  const result = {
    storage: {
      healthy: storageHealthy,
      initialized: true,
    },
    archon: archonHealth,
    overall: {
      healthy: storageHealthy && archonHealth?.healthy !== false,
    },
  };

  return {
    content: [
      {
        type: 'text',
        text: JSON.stringify(result, null, 2),
      },
    ],
  };
}

async function handleGetChangeHistory(input: ManageStorageInput) {
  if (!changeTracker) {
    throw new Error('Change tracker not initialized');
  }

  const historyOptions: any = {
    limit: input.historyLimit,
    offset: input.historyOffset,
  };

  if (input.author) {
    historyOptions.author = input.author;
  }
  if (input.changeType) {
    historyOptions.changeType = input.changeType;
  }

  const { changes, total, hasMore } = await changeTracker.getChangeHistory(
    input.fileId!,
    historyOptions
  );

  const result = {
    fileId: input.fileId,
    changes: changes.map(change => ({
      id: change.id,
      version: change.version,
      timestamp: change.timestamp.toISOString(),
      author: change.author,
      description: change.description,
      changeType: change.changeType,
      changes: change.changes.map(c => ({
        type: c.type,
        section: c.section,
        lineStart: c.lineStart,
        lineEnd: c.lineEnd,
        summary: c.summary,
      })),
      metadata: {
        sizeBefore: change.metadata.sizeBefore,
        sizeAfter: change.metadata.sizeAfter,
        linesBefore: change.metadata.linesBefore,
        linesAfter: change.metadata.linesAfter,
      },
    })),
    pagination: {
      total,
      offset: input.historyOffset || 0,
      limit: input.historyLimit || 10,
      hasMore,
    },
  };

  return {
    content: [
      {
        type: 'text',
        text: JSON.stringify(result, null, 2),
      },
    ],
  };
}

async function handleGenerateDiff(input: ManageStorageInput) {
  if (!changeTracker) {
    throw new Error('Change tracker not initialized');
  }

  const diff = await changeTracker.generateDiff(
    input.fileId!,
    input.fromVersion!,
    input.toVersion!,
    input.diffFormat || 'unified'
  );

  const result = {
    fileId: input.fileId,
    fromVersion: input.fromVersion,
    toVersion: input.toVersion,
    format: input.diffFormat || 'unified',
    diff,
  };

  return {
    content: [
      {
        type: 'text',
        text: JSON.stringify(result, null, 2),
      },
    ],
  };
}

async function handleRollback(input: ManageStorageInput) {
  if (!changeTracker) {
    throw new Error('Change tracker not initialized');
  }

  const rollbackOptions: any = {
    targetVersion: input.targetVersion!,
    createBackup: input.createBackup,
  };

  if (input.preserveChanges !== undefined) {
    rollbackOptions.preserveChanges = input.preserveChanges;
  }
  if (input.rollbackReason) {
    rollbackOptions.reason = input.rollbackReason;
  }

  const { content, changeRecord } = await changeTracker.rollbackToVersion(
    input.fileId!,
    rollbackOptions
  );

  const result = {
    success: true,
    fileId: input.fileId,
    targetVersion: input.targetVersion,
    content,
    changeRecord: {
      id: changeRecord.id,
      version: changeRecord.version,
      timestamp: changeRecord.timestamp.toISOString(),
      description: changeRecord.description,
      changeType: changeRecord.changeType,
    },
  };

  return {
    content: [
      {
        type: 'text',
        text: JSON.stringify(result, null, 2),
      },
    ],
  };
}

async function handleResolveConflict(input: ManageStorageInput) {
  if (!changeTracker) {
    throw new Error('Change tracker not initialized');
  }

  const resolution: any = {
    conflictId: input.conflictId!,
    fileId: input.fileId!,
    baseVersion: 0, // This would come from conflict detection
    conflictingVersions: [1], // This would come from conflict detection
    resolution: input.resolutionStrategy!,
    resolvedAt: new Date(),
  };

  if (input.mergedContent) {
    resolution.mergedContent = input.mergedContent;
  }
  if (input.resolvedBy) {
    resolution.resolvedBy = input.resolvedBy;
  }

  const resolvedContent = await changeTracker.resolveConflict(
    input.conflictId!,
    resolution,
    input.resolvedBy
  );

  const result = {
    success: true,
    conflictId: input.conflictId,
    resolution: input.resolutionStrategy,
    resolvedContent,
    resolvedBy: input.resolvedBy,
    resolvedAt: new Date().toISOString(),
  };

  return {
    content: [
      {
        type: 'text',
        text: JSON.stringify(result, null, 2),
      },
    ],
  };
}

async function handleGetAuditTrail(input: ManageStorageInput) {
  if (!changeTracker) {
    throw new Error('Change tracker not initialized');
  }

  const fromDate = input.fromDate ? new Date(input.fromDate) : undefined;
  const toDate = input.toDate ? new Date(input.toDate) : undefined;

  const auditTrail = await changeTracker.getAuditTrail(
    input.fileId!,
    fromDate,
    toDate
  );

  const result = {
    fileId: input.fileId,
    auditTrail: {
      ...auditTrail,
      timeline: auditTrail.timeline.map(change => ({
        id: change.id,
        version: change.version,
        timestamp: change.timestamp.toISOString(),
        author: change.author,
        description: change.description,
        changeType: change.changeType,
      })),
    },
  };

  return {
    content: [
      {
        type: 'text',
        text: JSON.stringify(result, null, 2),
      },
    ],
  };
}

async function handleReconnectArchon() {
  if (!integrationsManager) {
    throw new Error('Integrations manager not initialized');
  }

  const success = await integrationsManager.reconnect();
  const healthStatus = integrationsManager.getHealthStatus();

  const result = {
    success,
    archon: {
      available: integrationsManager.isArchonAvailable(),
      healthy: healthStatus.isHealthy,
      lastCheck: healthStatus.lastCheck.toISOString(),
      latency: healthStatus.latency,
      error: healthStatus.error,
      capabilities: healthStatus.capabilities,
    },
  };

  return {
    content: [
      {
        type: 'text',
        text: JSON.stringify(result, null, 2),
      },
    ],
  };
}

async function handleDeletePRP(input: ManageStorageInput) {
  if (!changeTracker) {
    throw new Error('Change tracker not initialized');
  }

  // Record deletion in change history before deleting
  await changeTracker.recordChange(
    input.fileId!,
    'delete',
    '', // No content before
    '', // No content after
    'PRP deleted via MCP tool'
  );

  // Delete from storage
  await storageSystem.deletePRP(input.fileId!);

  const result = {
    success: true,
    fileId: input.fileId,
    deleted: true,
    timestamp: new Date().toISOString(),
  };

  return {
    content: [
      {
        type: 'text',
        text: JSON.stringify(result, null, 2),
      },
    ],
  };
}

/**
 * Get the tool definition for manage_storage
 */
export function getManageStorageToolDefinition() {
  return {
    name: 'manage_storage',
    description:
      'Manage storage operations including versioning, change tracking, conflicts, and integrations',
    inputSchema: {
      type: 'object',
      properties: {
        action: {
          type: 'string',
          enum: [
            'get_stats',
            'health_check',
            'get_change_history',
            'generate_diff',
            'rollback',
            'resolve_conflict',
            'get_audit_trail',
            'reconnect_archon',
            'delete_prp',
          ],
          description: 'Storage management action to perform',
        },
        fileId: {
          type: 'string',
          description: 'File ID for file-specific operations',
        },
        fromVersion: {
          type: 'number',
          description: 'Starting version for diff/rollback operations',
        },
        toVersion: {
          type: 'number',
          description: 'Target version for diff/rollback operations',
        },
        targetVersion: {
          type: 'number',
          description: 'Target version for rollback',
        },
        diffFormat: {
          type: 'string',
          enum: ['unified', 'side-by-side', 'html'],
          description: 'Format for diff output',
        },
        rollbackReason: {
          type: 'string',
          description: 'Reason for rollback',
        },
        preserveChanges: {
          type: 'boolean',
          description: 'Whether to preserve changes during rollback',
        },
        createBackup: {
          type: 'boolean',
          default: true,
          description: 'Whether to create backup during operations',
        },
        conflictId: {
          type: 'string',
          description: 'Conflict ID for resolution',
        },
        resolutionStrategy: {
          type: 'string',
          enum: ['accept-current', 'accept-incoming', 'merge', 'manual'],
          description: 'Strategy for resolving conflicts',
        },
        mergedContent: {
          type: 'string',
          description: 'Manually merged content for conflict resolution',
        },
        resolvedBy: {
          type: 'string',
          description: 'Person resolving the conflict',
        },
        historyLimit: {
          type: 'number',
          minimum: 1,
          maximum: 100,
          default: 10,
          description: 'Number of history entries to return',
        },
        historyOffset: {
          type: 'number',
          minimum: 0,
          default: 0,
          description: 'Offset for history pagination',
        },
        fromDate: {
          type: 'string',
          description: 'Start date for audit trail (ISO format)',
        },
        toDate: {
          type: 'string',
          description: 'End date for audit trail (ISO format)',
        },
        author: {
          type: 'string',
          description: 'Filter by author',
        },
        changeType: {
          type: 'string',
          enum: ['create', 'update', 'delete', 'restore'],
          description: 'Filter by change type',
        },
      },
      required: ['action'],
      additionalProperties: false,
    },
  };
}
