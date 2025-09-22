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
  templateId: z.string().optional(),
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

// Codebase Analysis Types
export interface CodebasePattern {
  id: string;
  name: string;
  description: string;
  type: 'architectural' | 'design' | 'naming' | 'structure' | 'framework';
  confidence: number;
  examples: Array<{
    file: string;
    snippet: string;
    lineStart: number;
    lineEnd: number;
  }>;
  recommendations?: string[];
}

export interface FileAnalysis {
  path: string;
  language: string;
  framework?: string;
  imports: string[];
  exports: string[];
  functions: Array<{
    name: string;
    parameters: string[];
    returnType?: string;
    isAsync: boolean;
    complexity: number;
  }>;
  classes: Array<{
    name: string;
    methods: string[];
    properties: string[];
    inheritance?: string[];
  }>;
  patterns: CodebasePattern[];
  metrics: {
    linesOfCode: number;
    cyclomaticComplexity: number;
    maintainabilityIndex: number;
  };
}

export interface ProjectAnalysis {
  rootPath: string;
  language: string;
  framework?: string;
  architecture: string[];
  dependencies: Record<string, string>;
  devDependencies: Record<string, string>;
  fileAnalyses: FileAnalysis[];
  patterns: CodebasePattern[];
  conventions: {
    naming: string;
    structure: string[];
    imports: string;
  };
  recommendations: string[];
  generatedAt: Date;
}

// Question Engine Types
export interface Question {
  id: string;
  text: string;
  type: 'multiple-choice' | 'text' | 'boolean' | 'scale' | 'multi-select';
  category: 'functional' | 'technical' | 'business' | 'constraints' | 'stakeholders';
  priority: number;
  required: boolean;
  options?: string[];
  dependsOn?: string[];
  followUpQuestions?: Question[];
  context?: {
    pattern?: string;
    framework?: string;
    domain?: string;
  };
}

export interface QuestionnaireSession {
  id: string;
  projectId: string;
  startedAt: Date;
  completedAt?: Date;
  currentQuestionIndex: number;
  answers: Record<string, any>;
  questions: Question[];
  context: ProjectAnalysis;
}

export interface QuestionTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  questions: Question[];
  applicablePatterns?: string[];
  applicableFrameworks?: string[];
  applicableDomains?: string[];
}

// INITIAL.md Generation Types
export interface InitialMdConfig {
  projectName: string;
  projectType: string;
  framework?: string;
  domain: string;
  stakeholders: string[];
  constraints: string[];
  objectives: string[];
  technicalRequirements: string[];
  businessRequirements: string[];
  customSections?: Array<{
    title: string;
    content: string;
  }>;
}

export interface InitialMdTemplate {
  id: string;
  name: string;
  description: string;
  framework?: string;
  domain?: string;
  template: string;
  placeholders: string[];
  requiredQuestions: string[];
}

// PRP Validation Types
export interface PRPValidationResult {
  isValid: boolean;
  score: number;
  maxScore: number;
  sections: SectionValidation[];
  recommendations: string[];
  missingElements: string[];
  antiPatterns: AntiPattern[];
}

export interface SectionValidation {
  sectionTitle: string;
  isPresent: boolean;
  isComplete: boolean;
  score: number;
  maxScore: number;
  issues: string[];
  recommendations: string[];
}

export interface AntiPattern {
  id: string;
  name: string;
  description: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  instances: Array<{
    section: string;
    content: string;
    suggestion: string;
  }>;
}

// Execution Guidance Types
export interface PRPExecutionGuidance {
  agentRecommendations: AgentRecommendation[];
  taskBreakdown: TaskGroup[];
  riskAssessment: RiskAssessment;
  implementationOrder: ImplementationPhase[];
  technologyStack: TechnologyRecommendation[];
  estimatedComplexity: 'low' | 'medium' | 'high' | 'very-high';
  estimatedDuration: {
    minimum: number;
    maximum: number;
    unit: 'hours' | 'days' | 'weeks';
  };
}

export interface AgentRecommendation {
  agentType: string;
  count: number;
  priority: number;
  skills: string[];
  reasoning: string;
  specialization?: string;
}

export interface TaskGroup {
  id: string;
  title: string;
  description: string;
  tasks: ExecutionTask[];
  dependencies: string[];
  estimatedHours: number;
  priority: number;
  phase: string;
}

export interface ExecutionTask {
  id: string;
  title: string;
  description: string;
  acceptance: string[];
  dependencies: string[];
  estimatedHours: number;
  complexity: 'low' | 'medium' | 'high';
  category: 'planning' | 'development' | 'testing' | 'documentation' | 'deployment';
  agentTypes: string[];
}

export interface RiskAssessment {
  overallRisk: 'low' | 'medium' | 'high' | 'critical';
  risks: Risk[];
  mitigationStrategies: string[];
}

export interface Risk {
  id: string;
  category: 'technical' | 'business' | 'timeline' | 'resource' | 'external';
  severity: 'low' | 'medium' | 'high' | 'critical';
  probability: 'low' | 'medium' | 'high';
  description: string;
  impact: string;
  mitigation: string;
}

export interface ImplementationPhase {
  id: string;
  name: string;
  description: string;
  taskGroups: string[];
  dependencies: string[];
  deliverables: string[];
  estimatedDuration: number;
  criticalPath: boolean;
}

export interface TechnologyRecommendation {
  category: 'frontend' | 'backend' | 'database' | 'deployment' | 'monitoring' | 'testing' | 'ci-cd';
  technology: string;
  version?: string;
  reasoning: string;
  alternatives: string[];
  confidence: number;
}

// Content Generation Types
export interface ContentSynthesis {
  initialAnalysis: InitialMdAnalysis;
  codebaseInsights: CodebaseInsights;
  contextualEnrichment: ContextualEnrichment;
  generatedContent: GeneratedContent;
}

export interface InitialMdAnalysis {
  feature: string;
  examples: string[];
  documentation: string[];
  considerations: string[];
  extractedRequirements: string[];
  stakeholders: string[];
  constraints: string[];
  objectives: string[];
}

export interface CodebaseInsights {
  architecture: string[];
  patterns: string[];
  technologies: string[];
  conventions: string[];
  complexity: 'low' | 'medium' | 'high';
  recommendations: string[];
}

export interface ContextualEnrichment {
  domainKnowledge: string[];
  industryBestPractices: string[];
  antiPatternWarnings: string[];
  scalabilityConsiderations: string[];
  securityConsiderations: string[];
  performanceConsiderations: string[];
}

export interface GeneratedContent {
  sections: Record<string, string>;
  metadata: {
    generationMethod: 'template-based' | 'ai-assisted' | 'hybrid';
    confidenceScore: number;
    sourcesUsed: string[];
    generatedAt: Date;
  };
}