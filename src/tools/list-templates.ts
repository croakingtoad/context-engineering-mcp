import { z } from 'zod';
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
      throw new Error('Template manager not initialized');
    }

    // Get templates from real template manager
    let templates = templateManager.getAllTemplates();

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
    return {
      content: [
        {
          type: 'text',
          text: `Error listing templates: ${error instanceof Error ? error.message : 'Unknown error'}`,
        },
      ],
    };
  }
}
