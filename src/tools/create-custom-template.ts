import { z } from 'zod';
import { PRPSectionSchema, PRPTemplate } from '../types/index.js';
import { TemplateManager } from '../lib/template-manager.js';

// Template manager will be injected by main server
let templateManager: TemplateManager;

export function setTemplateManagerDependency(manager: TemplateManager) {
  templateManager = manager;
}

const CreateCustomTemplateArgsSchema = z.object({
  name: z.string(),
  description: z.string(),
  category: z.string(),
  sections: z.array(PRPSectionSchema),
  tags: z.array(z.string()).optional(),
});

export async function createCustomTemplateToolHandler(args: unknown): Promise<{
  content: Array<{ type: 'text'; text: string }>;
}> {
  try {
    const validatedArgs = CreateCustomTemplateArgsSchema.parse(args);

    if (!templateManager) {
      throw new Error('Template manager not initialized');
    }

    // Create a real template
    const templateId = `custom-${Date.now()}`;
    const template: PRPTemplate = {
      id: templateId,
      name: validatedArgs.name,
      description: validatedArgs.description,
      category: validatedArgs.category,
      sections: validatedArgs.sections,
      version: '1.0',
      author: 'Custom Template Creator',
      tags: validatedArgs.tags || [],
      created: new Date(),
      updated: new Date(),
    };

    // Actually create the template using the template manager
    await templateManager.createTemplate(template);

    const response = {
      templateId: templateId,
      name: validatedArgs.name,
      description: validatedArgs.description,
      category: validatedArgs.category,
      sectionsCount: validatedArgs.sections.length,
      created: new Date().toISOString(),
      message: `Template ${templateId} created successfully and is ready for use`,
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
          text: `Error creating custom template: ${error instanceof Error ? error.message : 'Unknown error'}`,
        },
      ],
    };
  }
}
