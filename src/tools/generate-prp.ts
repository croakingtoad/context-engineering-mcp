import { z } from 'zod';
import { PRPGenerationRequestSchema } from '../types/index.js';
import { PRPGenerator } from '../lib/prp-generator.js';
import { PRPValidator } from '../lib/prp-validator.js';
import { ExecutionGuidance } from '../lib/execution-guidance.js';
import { StorageSystem } from '../lib/storage.js';
import { IntegrationsManager } from '../lib/integrations.js';
import { ChangeTracker } from '../lib/change-tracker.js';

// Import singleton instances (will be set by main server)
let prpGenerator: PRPGenerator;
let prpValidator: PRPValidator;
let executionGuidance: ExecutionGuidance;
let storageSystem: StorageSystem;
let integrationsManager: IntegrationsManager;
let changeTracker: ChangeTracker;

export function setPRPGeneratorDependencies(
  generator: PRPGenerator,
  validator: PRPValidator,
  guidance: ExecutionGuidance,
  storage: StorageSystem,
  integrations: IntegrationsManager,
  tracker: ChangeTracker
) {
  prpGenerator = generator;
  prpValidator = validator;
  executionGuidance = guidance;
  storageSystem = storage;
  integrationsManager = integrations;
  changeTracker = tracker;
}

// Extended input schema for generate_prp tool with storage options
export const GeneratePRPInputSchema = PRPGenerationRequestSchema.extend({
  saveToStorage: z
    .boolean()
    .default(true)
    .describe('Whether to save the generated PRP to storage'),
  filename: z
    .string()
    .optional()
    .describe('Custom filename for the generated PRP'),
  saveToArchon: z
    .boolean()
    .default(false)
    .describe('Whether to save to Archon if available'),
  createTasks: z
    .boolean()
    .default(false)
    .describe('Whether to create Archon tasks from PRP sections'),
  projectId: z
    .string()
    .optional()
    .describe('Project ID for Archon integration'),
  author: z.string().optional().describe('Author of the generated PRP'),
  tags: z.array(z.string()).optional().describe('Tags for the generated PRP'),
  category: z
    .string()
    .default('prp')
    .describe('Category for the generated PRP'),

  // Enhanced generation options
  generationMode: z
    .enum(['template', 'intelligent', 'contextual'])
    .default('template')
    .describe(
      'Generation mode: template (basic), intelligent (from INITIAL.md), or contextual (enhanced template)'
    ),
  initialMdPath: z
    .string()
    .optional()
    .describe('Path to INITIAL.md file for intelligent generation'),
  projectPath: z
    .string()
    .optional()
    .describe('Path to project root for codebase analysis'),
  domain: z
    .string()
    .optional()
    .describe(
      'Business domain for context-aware generation (fintech, healthcare, e-commerce, etc.)'
    ),
  includeExecutionGuidance: z
    .boolean()
    .default(false)
    .describe(
      'Whether to include execution guidance with agent recommendations'
    ),
  includeValidation: z
    .boolean()
    .default(false)
    .describe('Whether to include validation results and recommendations'),
});

export type GeneratePRPInput = z.infer<typeof GeneratePRPInputSchema>;

// Track recent calls to prevent infinite loops
const recentCalls = new Map<string, { count: number; timestamp: number }>();
const CALL_WINDOW = 5 * 60 * 1000; // 5 minutes
const MAX_RETRIES = 3;

export async function generatePRPToolHandler(args: unknown): Promise<{
  content: Array<{ type: 'text'; text: string }>;
}> {
  try {
    const input = GeneratePRPInputSchema.parse(args);

    // Create a call signature to detect retries
    const callSignature = JSON.stringify({
      templateId: input.templateId,
      projectName: input.projectContext?.name,
      domain: input.projectContext?.domain,
    });

    // Check if this is a repeated call
    const now = Date.now();
    const recent = recentCalls.get(callSignature);

    if (recent && now - recent.timestamp < CALL_WINDOW) {
      recent.count++;
      if (recent.count > MAX_RETRIES) {
        return {
          content: [
            {
              type: 'text',
              text: `⚠️ RETRY LIMIT REACHED\n\nThis PRP generation has been attempted ${recent.count} times in the last 5 minutes.\n\nTo prevent infinite loops, please:\n1. Check the error messages above\n2. Use list_templates to verify available templates\n3. Modify your request parameters\n4. Wait a few minutes before trying again\n\nLast attempt parameters:\n- Template ID: ${input.templateId || 'not specified'}\n- Project: ${input.projectContext?.name || 'not specified'}\n- Domain: ${input.projectContext?.domain || 'not specified'}`,
            },
          ],
        };
      }
    } else {
      recentCalls.set(callSignature, { count: 1, timestamp: now });
    }

    if (!prpGenerator) {
      throw new Error('PRP generator not initialized');
    }

    // Generate the PRP based on the selected mode
    let generatedContent: string;

    // Default templateId if not provided
    const templateId = input.templateId || 'base-prp-template';

    switch (input.generationMode) {
      case 'intelligent':
        if (!input.initialMdPath) {
          throw new Error(
            'initialMdPath is required for intelligent generation mode'
          );
        }
        generatedContent = await prpGenerator.generateIntelligentPRP(
          input.initialMdPath,
          input.projectPath,
          templateId,
          input.domain || input.projectContext.domain,
          input.outputFormat
        );
        break;

      case 'contextual':
        generatedContent = await prpGenerator.generateContextualPRP(
          {
            templateId: templateId,
            projectContext: input.projectContext,
            customSections: input.customSections,
            outputFormat: input.outputFormat,
          },
          input.initialMdPath,
          input.projectPath
        );
        break;

      case 'template':
      default:
        generatedContent = await prpGenerator.generatePRP({
          templateId: input.templateId,
          projectContext: input.projectContext,
          customSections: input.customSections,
          outputFormat: input.outputFormat,
        });
        break;
    }

    const result: any = {
      success: true,
      generationMode: input.generationMode,
      template: input.templateId,
      projectContext: input.projectContext,
      outputFormat: input.outputFormat,
      content: generatedContent,
    };

    // Add validation if requested
    if (input.includeValidation && prpValidator) {
      try {
        const validationResult =
          await prpValidator.validatePRP(generatedContent);
        result.validation = {
          isValid: validationResult.isValid,
          score: validationResult.score,
          maxScore: validationResult.maxScore,
          completeness: `${Math.round((validationResult.score / validationResult.maxScore) * 100)}%`,
          recommendations: validationResult.recommendations.slice(0, 5), // Top 5 recommendations
          antiPatterns: validationResult.antiPatterns.map(ap => ({
            id: ap.id,
            name: ap.name,
            severity: ap.severity,
            instanceCount: ap.instances.length,
          })),
          missingElements: validationResult.missingElements,
        };
      } catch (validationError) {
        result.validation = {
          error:
            validationError instanceof Error
              ? validationError.message
              : 'Validation failed',
        };
      }
    }

    // Add execution guidance if requested
    if (input.includeExecutionGuidance && executionGuidance) {
      try {
        const guidance =
          await executionGuidance.generateExecutionGuidance(generatedContent);
        result.executionGuidance = {
          estimatedComplexity: guidance.estimatedComplexity,
          estimatedDuration: guidance.estimatedDuration,
          agentRecommendations: guidance.agentRecommendations
            .slice(0, 5)
            .map(agent => ({
              agentType: agent.agentType,
              count: agent.count,
              priority: agent.priority,
              reasoning: agent.reasoning,
              specialization: agent.specialization,
            })),
          riskAssessment: {
            overallRisk: guidance.riskAssessment.overallRisk,
            riskCount: guidance.riskAssessment.risks.length,
            topRisks: guidance.riskAssessment.risks
              .filter(r => r.severity === 'high' || r.severity === 'critical')
              .slice(0, 3)
              .map(r => ({
                category: r.category,
                severity: r.severity,
                description: r.description,
              })),
          },
          taskBreakdown: {
            totalTasks: guidance.taskBreakdown.reduce(
              (sum, group) => sum + group.tasks.length,
              0
            ),
            totalHours: guidance.taskBreakdown.reduce(
              (sum, group) => sum + group.estimatedHours,
              0
            ),
            phases: guidance.implementationOrder.map(phase => ({
              id: phase.id,
              name: phase.name,
              estimatedDuration: phase.estimatedDuration,
              criticalPath: phase.criticalPath,
            })),
          },
        };
      } catch (guidanceError) {
        result.executionGuidance = {
          error:
            guidanceError instanceof Error
              ? guidanceError.message
              : 'Guidance generation failed',
        };
      }
    }

    // Save to storage if requested
    if (input.saveToStorage && storageSystem) {
      try {
        const filename =
          input.filename ||
          `prp_${input.projectContext.name.toLowerCase().replace(/\s+/g, '_')}_${Date.now()}.md`;

        const storageMetadata: any = {
          tags: input.tags || ['generated', input.projectContext.domain],
          category: input.category,
        };

        if (input.author) {
          storageMetadata.author = input.author;
        }

        const fileMetadata = await storageSystem.storePRP(
          filename,
          generatedContent,
          storageMetadata
        );

        // Record the creation in change tracker
        if (changeTracker) {
          await changeTracker.recordChange(
            fileMetadata.id,
            'create',
            '',
            generatedContent,
            `Generated PRP from template ${input.templateId}`,
            input.author
          );
        }

        result.storage = {
          saved: true,
          fileId: fileMetadata.id,
          filename: fileMetadata.name,
          path: fileMetadata.path,
          version: fileMetadata.version,
          size: fileMetadata.size,
          created: fileMetadata.created.toISOString(),
        };

        // Save to Archon if requested and available
        if (input.saveToArchon && integrationsManager?.isArchonAvailable()) {
          try {
            const archonOptions: any = {
              createArchonDocument: true,
              createTasks: input.createTasks,
            };

            if (input.projectId) {
              archonOptions.projectId = input.projectId;
            }

            const archonResult = await integrationsManager.storePRP(
              filename,
              generatedContent,
              fileMetadata,
              archonOptions
            );

            result.archon = {
              saved: true,
              document: archonResult.archonDocument
                ? {
                    id: archonResult.archonDocument.id,
                    title: archonResult.archonDocument.title,
                    created: archonResult.archonDocument.created.toISOString(),
                  }
                : null,
              tasks:
                archonResult.tasks?.map(task => ({
                  id: task.id,
                  title: task.title,
                  status: task.status,
                  created: task.created.toISOString(),
                })) || [];
            };
          } catch (archonError) {
            result.archon = {
              saved: false,
              error:
                archonError instanceof Error
                  ? archonError.message
                  : 'Failed to save to Archon',
            };
          }
        }
      } catch (storageError) {
        result.storage = {
          saved: false,
          error:
            storageError instanceof Error
              ? storageError.message
              : 'Failed to save to storage',
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
    // Provide helpful error messages instead of generic ones
    let errorMessage = `Error generating PRP: ${error instanceof Error ? error.message : 'Unknown error'}`;

    if (error.message && error.message.includes('not found')) {
      errorMessage +=
        '\n\nAvailable templates:\n- base-prp-template (general purpose)\n- web-application-template (web development)\n- api-development-template (API development)\n\nUse list_templates tool to see all available templates.';
    }

    return {
      content: [
        {
          type: 'text',
          text: errorMessage,
        },
      ],
    };
  }
}
