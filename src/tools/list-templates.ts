import { z } from 'zod';
import { McpError, ErrorCode } from '@modelcontextprotocol/sdk/types.js';
import { TemplateManager } from '../lib/template-manager.js';

// Template manager will be injected by main server
let templateManager: TemplateManager;

export function setTemplateManagerDependency(manager: TemplateManager) {
  templateManager = manager;
}

const ListTemplatesArgsSchema = z.object({
  category: z.string().optional(),
});

export async function listTemplatesToolHandler(args: unknown): Promise<{
  content: Array<{ type: 'text'; text: string }>;
}> {
  try {
    const validatedArgs = ListTemplatesArgsSchema.parse(args);

    if (!templateManager) {
      throw new McpError(
        ErrorCode.InternalError,
        'Template manager not initialized - server may not have started correctly'
      );
    }

    // Get templates from real template manager
    let templates = templateManager.getAllTemplates();

    // If no templates loaded, this is a critical error
    if (templates.length === 0) {
      throw new McpError(
        ErrorCode.InternalError,
        'No templates loaded from template directories. Check template paths and file formats.'
      );
    }

    // Filter by category if specified
    if (validatedArgs.category) {
      templates = templates.filter(t => t.category === validatedArgs.category);
    }

    const response = {
      templates: templates.map(t => ({
        id: t.id,
        name: t.name,
        description: t.description,
        category: t.category,
        tags: t.tags,
        author: t.author,
        version: t.version,
      })),
      totalCount: templates.length,
      filteredBy: validatedArgs.category || null,
      message: `Found ${templates.length} templates`,
    };

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(response, null, 2),
        },
      ],
    };
  } catch (error) {
    if (error instanceof McpError) {
      throw error;
    }
    throw new McpError(
      ErrorCode.InternalError,
      `Failed to list templates: ${error instanceof Error ? error.message : 'Unknown error'}`,
      { originalError: error instanceof Error ? error.stack : String(error) }
    );
  }
}
