import { z } from 'zod';

// Core context engineering types
export const PRPSectionSchema = z.object({
  title: z.string(),
  content: z.string(),
  examples: z.array(z.string()).optional(),
  requirements: z.array(z.string()).optional(),
  metadata: z.record(z.any()).optional(),
});

export const PRPTemplateSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  category: z.string(),
  sections: z.array(PRPSectionSchema),
  version: z.string(),
  author: z.string().optional(),
  tags: z.array(z.string()).optional(),
  created: z.string().optional().transform((str) => str ? new Date(str) : undefined),
  updated: z.string().optional().transform((str) => str ? new Date(str) : undefined),
});

export const ContextEngineeringWorkflowSchema = z.object({
  id: z.string(),
  name: z.string(),
  steps: z.array(z.object({
    id: z.string(),
    title: z.string(),
    description: z.string(),
    tool: z.string(),
    parameters: z.record(z.any()).optional(),
    dependencies: z.array(z.string()).optional(),
  })),
  metadata: z.record(z.any()).optional(),
});

export const PRPGenerationRequestSchema = z.object({
  templateId: z.string(),
  projectContext: z.object({
    name: z.string(),
    domain: z.string(),
    stakeholders: z.array(z.string()).optional(),
    constraints: z.array(z.string()).optional(),
    objectives: z.array(z.string()).optional(),
  }),
  customSections: z.array(PRPSectionSchema).optional(),
  outputFormat: z.enum(['markdown', 'json', 'html']).default('markdown'),
});

// Export types
export type PRPSection = z.infer<typeof PRPSectionSchema>;
export type PRPTemplate = z.infer<typeof PRPTemplateSchema>;
export type ContextEngineeringWorkflow = z.infer<typeof ContextEngineeringWorkflowSchema>;
export type PRPGenerationRequest = z.infer<typeof PRPGenerationRequestSchema>;

// MCP Server specific types
export interface MCPTool {
  name: string;
  description: string;
  inputSchema: z.ZodSchema;
  handler: (params: any) => Promise<any>;
}

export interface MCPResource {
  uri: string;
  name: string;
  description: string;
  mimeType: string;
  handler: () => Promise<string | object>;
}

// Context engineering methodology types
export interface ContextEngineeringStep {
  id: string;
  name: string;
  description: string;
  prompt: string;
  expectedOutput: string;
  validation?: (output: string) => boolean;
}

export interface ContextEngineeringMethodology {
  name: string;
  description: string;
  steps: ContextEngineeringStep[];
  metadata: {
    author: string;
    version: string;
    lastUpdated: Date;
  };
}