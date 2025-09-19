import { z } from 'zod';

const ListTemplatesArgsSchema = z.object({
  category: z.string().optional(),
});

export async function listTemplatesToolHandler(args: unknown): Promise<{
  content: Array<{ type: 'text'; text: string }>;
}> {
  // Validate arguments (currently unused in placeholder)
  ListTemplatesArgsSchema.parse(args);

  // Placeholder implementation - will be enhanced
  const mockResponse = {
    templates: [
      {
        id: 'basic-web-app',
        name: 'Basic Web Application',
        description: 'Template for basic web application projects',
        category: 'web-development',
      },
    ],
    message: 'Template listing functionality - to be fully implemented',
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