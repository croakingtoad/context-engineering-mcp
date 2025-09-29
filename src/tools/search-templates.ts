import { z } from 'zod';
import { McpError, ErrorCode } from '@modelcontextprotocol/sdk/types.js';
import { TemplateManager } from '../lib/template-manager.js';

// Template manager will be injected by main server
let templateManager: TemplateManager;

export function setTemplateManagerDependency(manager: TemplateManager) {
  templateManager = manager;
}

const SearchTemplatesArgsSchema = z.object({
  query: z.string(),
  category: z.string().optional(),
});

export async function searchTemplatesToolHandler(args: unknown): Promise<{
  content: Array<{ type: 'text'; text: string }>;
}> {
  try {
    const validatedArgs = SearchTemplatesArgsSchema.parse(args);

    if (!templateManager) {
      throw new McpError(
        ErrorCode.InternalError,
        'Template manager not initialized - server may not have started correctly'
      );
    }

    // Search real templates
    let results = templateManager.searchTemplates(validatedArgs.query);

    // Filter by category if specified
    if (validatedArgs.category) {
      results = results.filter(t => t.category === validatedArgs.category);
    }

    const response = {
      query: validatedArgs.query,
      category: validatedArgs.category,
      results: results.map(template => ({
        id: template.id,
        name: template.name,
        description: template.description,
        category: template.category,
        relevanceScore: 90, // Could be enhanced with better scoring
      })),
      totalFound: results.length,
      message: `Found ${results.length} matching templates`,
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
      `Failed to search templates: ${error instanceof Error ? error.message : 'Unknown error'}`,
      { originalError: error instanceof Error ? error.stack : String(error) }
    );
  }
}
