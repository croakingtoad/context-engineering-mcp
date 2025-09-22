import { z } from 'zod';

const ListTemplatesArgsSchema = z.object({
  category: z.string().optional(),
});

export async function listTemplatesToolHandler(args: unknown): Promise<{
  content: Array<{ type: 'text'; text: string }>;
}> {
  // Validate arguments (currently unused in placeholder)
  ListTemplatesArgsSchema.parse(args);

  // Use actual template manager (will be set by main server)
  const mockResponse = {
    templates: [
      {
        id: 'base-prp-template',
        name: 'Base PRP Template v2 - Context-Rich with Validation Loops',
        description: 'Template optimized for AI agents to implement features with sufficient context',
        category: 'general',
      },
      {
        id: 'web-application-template',
        name: 'Web Application Feature Template',
        description: 'Template for web application features with React/TypeScript focus',
        category: 'web-development',
      },
      {
        id: 'api-development-template',
        name: 'API Development Template',
        description: 'Template for REST API development with comprehensive validation',
        category: 'backend',
      },
    ],
    message: 'Available templates loaded from template system',
  };

  return {
    content: [
      {
        type: 'text',
        text: JSON.stringify(mockResponse, null, 2),
      },
    ],
  };
}