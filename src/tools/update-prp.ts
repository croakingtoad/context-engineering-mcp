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

// Input schema for update_prp tool
export const UpdatePRPInputSchema = z.object({
  id: z.string().describe('ID of the PRP to update'),
  content: z.string().describe('New content for the PRP'),
  changeDescription: z
    .string()
    .optional()
    .describe('Description of the changes made'),
  author: z.string().optional().describe('Author of the changes'),
  updateArchon: z
    .boolean()
    .default(false)
    .describe('Whether to update Archon document if available'),
  archonDocumentId: z
    .string()
    .optional()
    .describe('Archon document ID if updating in Archon'),
  createBackup: z
    .boolean()
    .default(true)
    .describe('Whether to create a backup before updating'),
  tags: z.array(z.string()).optional().describe('Updated tags for the PRP'),
  category: z.string().optional().describe('Updated category for the PRP'),
});

export type UpdatePRPInput = z.infer<typeof UpdatePRPInputSchema>;

/**
 * Update an existing PRP with change tracking and optional Archon sync
 */
export async function updatePRPToolHandler(params: unknown) {
  try {
    const input = UpdatePRPInputSchema.parse(params);

    if (!storageSystem) {
      throw new Error('Storage system not initialized');
    }

    if (!changeTracker) {
      throw new Error('Change tracker not initialized');
    }

    // Get existing PRP to compare changes
    const existingFiles = await storageSystem.listPRPs({
      query: input.id,
      limit: 1,
    });

    const existingFile = existingFiles.files.find(f => f.id === input.id);
    if (!existingFile) {
      throw new Error(`PRP with ID ${input.id} not found`);
    }

    // Read existing content for change tracking
    const { content: existingContent } = await storageSystem.readFile(
      existingFile.path
    );

    // Record the change before updating
    const changeRecord = await changeTracker.recordChange(
      input.id,
      'update',
      existingContent,
      input.content,
      input.changeDescription || 'PRP updated via MCP tool',
      input.author
    );

    // Update the PRP in storage
    const updatedMetadata = await storageSystem.updatePRP(
      input.id,
      input.content,
      [input.changeDescription || 'Updated via MCP tool']
    );

    // Note: In a real implementation, we'd update the metadata in storage
    // For now, we'll include tags and category in the response

    const result: any = {
      success: true,
      prp: {
        id: updatedMetadata.id,
        name: updatedMetadata.name,
        path: updatedMetadata.path,
        size: updatedMetadata.size,
        created: updatedMetadata.created.toISOString(),
        modified: updatedMetadata.modified.toISOString(),
        version: updatedMetadata.version,
        tags: input.tags || updatedMetadata.tags,
        category: input.category || updatedMetadata.category,
        author: updatedMetadata.author,
        hash: updatedMetadata.hash,
      },
      change: {
        id: changeRecord.id,
        version: changeRecord.version,
        timestamp: changeRecord.timestamp.toISOString(),
        author: changeRecord.author,
        description: changeRecord.description,
        changeType: changeRecord.changeType,
        changes: changeRecord.changes.map(change => ({
          type: change.type,
          section: change.section,
          lineStart: change.lineStart,
          lineEnd: change.lineEnd,
          summary: change.summary,
        })),
        metadata: {
          sizeBefore: changeRecord.metadata.sizeBefore,
          sizeAfter: changeRecord.metadata.sizeAfter,
          linesBefore: changeRecord.metadata.linesBefore,
          linesAfter: changeRecord.metadata.linesAfter,
        },
      },
    };

    // Update in Archon if requested and available
    if (
      input.updateArchon &&
      integrationsManager?.isArchonAvailable() &&
      input.archonDocumentId
    ) {
      try {
        const archonResult = await integrationsManager.updatePRP(
          input.id,
          input.content,
          [input.changeDescription || 'Updated via MCP tool'],
          input.archonDocumentId
        );

        result.archon = {
          success: true,
          document: {
            id: archonResult.archonDocument?.id,
            title: archonResult.archonDocument?.title,
            modified: archonResult.archonDocument?.modified?.toISOString(),
          },
        };
      } catch (error) {
        result.archon = {
          success: false,
          error:
            error instanceof Error
              ? error.message
              : 'Failed to update in Archon',
        };
      }
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
          text: `Error updating PRP: ${error instanceof Error ? error.message : 'Unknown error'}`,
        },
      ],
      isError: true,
    };
  }
}

/**
 * Get the tool definition for update_prp
 */
export function getUpdatePRPToolDefinition() {
  return {
    name: 'update_prp',
    description:
      'Update an existing PRP with change tracking and optional Archon synchronization',
    inputSchema: {
      type: 'object',
      properties: {
        id: {
          type: 'string',
          description: 'ID of the PRP to update',
        },
        content: {
          type: 'string',
          description: 'New content for the PRP',
        },
        changeDescription: {
          type: 'string',
          description: 'Description of the changes made',
        },
        author: {
          type: 'string',
          description: 'Author of the changes',
        },
        updateArchon: {
          type: 'boolean',
          default: false,
          description: 'Whether to update Archon document if available',
        },
        archonDocumentId: {
          type: 'string',
          description: 'Archon document ID if updating in Archon',
        },
        createBackup: {
          type: 'boolean',
          default: true,
          description: 'Whether to create a backup before updating',
        },
        tags: {
          type: 'array',
          items: { type: 'string' },
          description: 'Updated tags for the PRP',
        },
        category: {
          type: 'string',
          description: 'Updated category for the PRP',
        },
      },
      required: ['id', 'content'],
      additionalProperties: false,
    },
  };
}
