import { z } from 'zod';
import { CodebaseAnalyzer } from '../lib/codebase-analyzer.js';
import { TemplateManager } from '../lib/template-manager.js';

// Dependencies will be injected by main server
let codebaseAnalyzer: CodebaseAnalyzer;
let templateManager: TemplateManager;

export function setAnalyzeContextDependencies(analyzer: CodebaseAnalyzer, manager: TemplateManager) {
  codebaseAnalyzer = analyzer;
  templateManager = manager;
}

const AnalyzeContextArgsSchema = z.object({
  projectContext: z.object({
    name: z.string(),
    domain: z.string(),
    description: z.string().optional(),
    stakeholders: z.array(z.string()).optional(),
    constraints: z.array(z.string()).optional(),
    objectives: z.array(z.string()).optional(),
    existingRequirements: z.string().optional(),
  }).passthrough(),
  projectPath: z.string().optional(),
  includeTemplateRecommendations: z.boolean().default(true),
});

export async function analyzeContextToolHandler(args: unknown): Promise<{
  content: Array<{ type: 'text'; text: string }>;
}> {
  try {
    const validatedArgs = AnalyzeContextArgsSchema.parse(args);

    if (!templateManager) {
      throw new Error('Template manager not initialized');
    }

    // Analyze the project context
    const analysis = {
      projectContext: validatedArgs.projectContext,
      complexity: 'Medium', // Could be enhanced with real analysis
      domainAnalysis: {
        primaryDomain: validatedArgs.projectContext.domain,
        subDomains: [],
        technicalRequirements: [],
      },
      recommendedTemplates: [],
      missingElements: [],
      suggestions: [],
    };

    // Get template recommendations based on domain and description
    if (validatedArgs.includeTemplateRecommendations) {
      const allTemplates = templateManager.getAllTemplates();

      // Simple matching algorithm based on domain and description
      const domainKeywords = validatedArgs.projectContext.domain.toLowerCase();
      const description = validatedArgs.projectContext.description?.toLowerCase() || '';

      for (const template of allTemplates) {
        let matchScore = 0;

        // Check category match
        if (domainKeywords.includes('web') && template.category.includes('web')) matchScore += 40;
        if (domainKeywords.includes('api') && template.category.includes('backend')) matchScore += 40;
        if (description.includes('dashboard') && template.name.toLowerCase().includes('web')) matchScore += 30;

        // Check tag matches
        if (template.tags) {
          for (const tag of template.tags) {
            if (domainKeywords.includes(tag.toLowerCase()) || description.includes(tag.toLowerCase())) {
              matchScore += 10;
            }
          }
        }

        if (matchScore > 30) {
          analysis.recommendedTemplates.push({
            id: template.id,
            name: template.name,
            matchScore: Math.min(matchScore, 100),
            reason: `Matches ${template.category} category and project requirements`,
          });
        }
      }

      // Sort by match score
      analysis.recommendedTemplates.sort((a, b) => b.matchScore - a.matchScore);
    }

    // Add analysis suggestions
    analysis.suggestions = [
      'Consider defining specific user acceptance criteria',
      'Include performance and scalability requirements',
      'Add security and compliance considerations',
    ];

    analysis.missingElements = [
      'Detailed technical architecture',
      'Specific performance benchmarks',
      'Risk assessment and mitigation strategies',
    ];

    const response = {
      ...analysis,
      message: `Context analysis complete - Found ${analysis.recommendedTemplates.length} matching templates`,
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
          text: `Error analyzing context: ${error instanceof Error ? error.message : 'Unknown error'}`,
        },
      ],
    };
  }
}