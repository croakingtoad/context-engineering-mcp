import { z } from 'zod';
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
      throw new Error('Template manager not initialized');
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
    return {
      content: [
        {
          type: 'text',
          text: `Error searching templates: ${error instanceof Error ? error.message : 'Unknown error'}`,
        },
      ],
    };
  }
}