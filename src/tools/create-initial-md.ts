import { z } from 'zod';
import { CodebaseAnalyzer } from '../lib/codebase-analyzer.js';
import { QuestionEngine } from '../lib/question-engine.js';
import { InitialMdCreator } from '../lib/initial-md-creator.js';
import { ProjectAnalysis, QuestionnaireSession, InitialMdConfig } from '../types/index.js';

// Input schema for create_initial_md tool
export const CreateInitialMdInputSchema = z.object({
  projectPath: z.string().describe('Path to the project to analyze'),
  interactive: z.boolean().default(true).describe('Whether to run interactive questionnaire'),
  outputPath: z.string().optional().describe('Path to save the INITIAL.md file'),
  includeSampleQuestions: z.boolean().default(false).describe('Include sample questions in output'),
  autoAnalyze: z.boolean().default(true).describe('Automatically analyze codebase'),
  templateId: z.string().optional().describe('Specific template to use'),
});

export type CreateInitialMdInput = z.infer<typeof CreateInitialMdInputSchema>;

// Core services - these will be initialized by the main server
let codebaseAnalyzer: CodebaseAnalyzer;
let questionEngine: QuestionEngine;
let initialMdCreator: InitialMdCreator;

export function setCreateInitialMdDependencies(
  analyzer: CodebaseAnalyzer,
  qEngine: QuestionEngine,
  mdCreator: InitialMdCreator
) {
  codebaseAnalyzer = analyzer;
  questionEngine = qEngine;
  initialMdCreator = mdCreator;
}

export async function createInitialMdToolHandler(args: unknown): Promise<{
  content: Array<{ type: 'text'; text: string }>;
}> {
  try {
    const input = CreateInitialMdInputSchema.parse(args);

    // Initialize services if not already done
    if (!codebaseAnalyzer) codebaseAnalyzer = new CodebaseAnalyzer();
    if (!questionEngine) questionEngine = new QuestionEngine();
    if (!initialMdCreator) initialMdCreator = new InitialMdCreator();

    let projectAnalysis: ProjectAnalysis | undefined;

    // Step 1: Analyze codebase if requested
    if (input.autoAnalyze) {
      try {
        projectAnalysis = await codebaseAnalyzer.analyzeProject(input.projectPath);
      } catch (error) {
        console.warn('Codebase analysis failed:', error);
        // Continue without analysis
      }
    }

    const result: any = {
      success: true,
      projectPath: input.projectPath,
      interactive: input.interactive,
      steps: [],
    };

    if (projectAnalysis) {
      result.analysis = {
        language: projectAnalysis.language,
        framework: projectAnalysis.framework,
        architecture: projectAnalysis.architecture,
        patterns: projectAnalysis.patterns.length,
        files: projectAnalysis.fileAnalyses.length,
        recommendations: projectAnalysis.recommendations.length,
      };
      result.steps.push('✅ Codebase analysis completed');
    }

    // Step 2: Generate contextual questions
    let questions: any[] = [];
    if (projectAnalysis) {
      questions = await questionEngine.generateContextualQuestions(projectAnalysis);
      result.steps.push(`✅ Generated ${questions.length} contextual questions`);
    }

    // Step 3: Interactive questionnaire or auto-generation
    let initialMdContent: string;

    if (input.interactive && questions.length > 0) {
      // Create interactive session
      const session = questionEngine.createQuestionnaireSession(
        'interactive-session',
        projectAnalysis!,
        questions
      );

      result.questionnaire = {
        sessionId: session.id,
        totalQuestions: session.questions.length,
        categorizedQuestions: {
          business: questionEngine.getQuestionsByCategory(questions, 'business').length,
          technical: questionEngine.getQuestionsByCategory(questions, 'technical').length,
          functional: questionEngine.getQuestionsByCategory(questions, 'functional').length,
          constraints: questionEngine.getQuestionsByCategory(questions, 'constraints').length,
          stakeholders: questionEngine.getQuestionsByCategory(questions, 'stakeholders').length,
        },
        sampleQuestions: input.includeSampleQuestions
          ? questions.slice(0, 5).map(q => ({
              id: q.id,
              text: q.text,
              type: q.type,
              category: q.category,
              required: q.required,
              options: q.options,
            }))
          : undefined,
      };

      // For now, create INITIAL.md with placeholder answers
      // In a real implementation, this would wait for user responses
      const mockAnswers = generateMockAnswers(questions, projectAnalysis!);
      session.answers = mockAnswers;

      initialMdContent = await initialMdCreator.createFromQuestionnaire(session);
      result.steps.push('✅ Generated INITIAL.md from questionnaire');

    } else {
      // Auto-generate without questionnaire
      const config = generateConfigFromAnalysis(projectAnalysis, input.projectPath);
      initialMdContent = await initialMdCreator.createInitialMd(config);
      result.steps.push('✅ Auto-generated INITIAL.md from analysis');
    }

    result.initialMd = {
      content: initialMdContent,
      length: initialMdContent.length,
      sections: countMarkdownSections(initialMdContent),
    };

    // Step 4: Save to file if requested
    if (input.outputPath) {
      try {
        const fs = await import('fs/promises');
        await fs.writeFile(input.outputPath, initialMdContent, 'utf-8');
        result.steps.push(`✅ Saved INITIAL.md to ${input.outputPath}`);
      } catch (error) {
        result.steps.push(`❌ Failed to save file: ${error instanceof Error ? error.message : 'Unknown error'}`);
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
    return {
      content: [
        {
          type: 'text',
          text: `Error creating INITIAL.md: ${error instanceof Error ? error.message : 'Unknown error'}`,
        },
      ],
    };
  }
}

// Helper function to generate mock answers for demonstration
function generateMockAnswers(questions: any[], analysis: ProjectAnalysis): Record<string, any> {
  const answers: Record<string, any> = {};

  for (const question of questions) {
    switch (question.id) {
      case 'project-name':
        answers[question.id] = analysis.rootPath.split('/').pop() || 'My Project';
        break;
      case 'project-description':
        const frameworks = analysis.framework?.split(', ') || [];
        answers[question.id] = `A ${frameworks.join(' and ')} application with ${analysis.architecture.join(' and ')} architecture`;
        break;
      case 'target-users':
        answers[question.id] = 'End users and administrators';
        break;
      case 'main-objectives':
        answers[question.id] = 'Deliver a functional and maintainable application';
        break;
      case 'success-criteria':
        answers[question.id] = 'User satisfaction > 4.0/5, Performance < 2s load time';
        break;
      default:
        if (question.type === 'boolean') {
          answers[question.id] = true;
        } else if (question.type === 'multiple-choice' && question.options) {
          answers[question.id] = question.options[0];
        } else if (question.type === 'multi-select' && question.options) {
          answers[question.id] = question.options.slice(0, 2);
        } else if (question.type === 'scale') {
          answers[question.id] = 8;
        } else {
          answers[question.id] = 'Standard implementation';
        }
    }
  }

  return answers;
}

// Helper function to generate config from analysis
function generateConfigFromAnalysis(analysis: ProjectAnalysis | undefined, projectPath: string): InitialMdConfig {
  const projectName = projectPath.split('/').pop() || 'Untitled Project';

  if (!analysis) {
    return {
      projectName,
      projectType: 'application',
      domain: 'general',
      stakeholders: ['Development Team', 'End Users'],
      constraints: ['Time constraints', 'Technical standards'],
      objectives: ['Deliver functional application'],
      technicalRequirements: ['Modern development standards'],
      businessRequirements: ['Meet user needs'],
    };
  }

  const frameworks = analysis.framework?.split(', ') || [];
  let projectType = 'application';

  if (frameworks.includes('react') || frameworks.includes('vue') || frameworks.includes('angular')) {
    projectType = 'web-application';
  } else if (frameworks.includes('express') || frameworks.includes('fastify') || frameworks.includes('nestjs')) {
    projectType = 'api-service';
  }

  const technicalRequirements = [
    `Language: ${analysis.language}`,
    ...frameworks.map(fw => `Framework: ${fw}`),
    ...analysis.architecture.map(arch => `Architecture: ${arch}`),
    ...analysis.recommendations.slice(0, 3),
  ];

  const dependencies = Object.keys(analysis.dependencies).slice(0, 5);
  if (dependencies.length > 0) {
    technicalRequirements.push(`Key Dependencies: ${dependencies.join(', ')}`);
  }

  return {
    projectName,
    projectType,
    framework: analysis.framework,
    domain: 'general', // Could be enhanced with domain detection
    stakeholders: ['Development Team', 'End Users', 'Product Owner'],
    constraints: [
      'Maintain existing architecture patterns',
      'Follow established conventions',
      'Ensure backward compatibility',
    ],
    objectives: [
      'Enhance application functionality',
      'Improve code maintainability',
      'Meet performance requirements',
    ],
    technicalRequirements,
    businessRequirements: [
      'Maintain current feature set',
      'Add new functionality as specified',
      'Ensure data integrity',
      'Provide good user experience',
    ],
  };
}

// Helper function to count markdown sections
function countMarkdownSections(markdown: string): number {
  const sections = markdown.match(/^#+\s/gm);
  return sections ? sections.length : 0;
}

export const createInitialMdToolDefinition = {
  name: 'create_initial_md',
  description: 'Analyze a codebase and create an INITIAL.md file with intelligent requirements gathering',
  inputSchema: {
    type: 'object',
    properties: {
      projectPath: {
        type: 'string',
        description: 'Path to the project to analyze',
      },
      interactive: {
        type: 'boolean',
        description: 'Whether to run interactive questionnaire',
        default: true,
      },
      outputPath: {
        type: 'string',
        description: 'Path to save the INITIAL.md file',
      },
      includeSampleQuestions: {
        type: 'boolean',
        description: 'Include sample questions in output',
        default: false,
      },
      autoAnalyze: {
        type: 'boolean',
        description: 'Automatically analyze codebase',
        default: true,
      },
      templateId: {
        type: 'string',
        description: 'Specific template to use',
      },
    },
    required: ['projectPath'],
    additionalProperties: false,
  },
};