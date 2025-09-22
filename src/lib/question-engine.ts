import {
  Question,
  QuestionnaireSession,
  QuestionTemplate,
  ProjectAnalysis,
  CodebasePattern,
} from '../types';

export interface AnswerResult {
  success: boolean;
  error?: string;
  followUpQuestions?: Question[];
}

export class QuestionEngine {
  private templates: Map<string, QuestionTemplate> = new Map();

  constructor() {
    this.loadDefaultTemplates();
  }

  async generateContextualQuestions(
    projectAnalysis: ProjectAnalysis
  ): Promise<Question[]> {
    const questions: Question[] = [];

    // Add base questions that apply to all projects
    questions.push(...this.getBaseQuestions());

    // Add framework-specific questions
    questions.push(...this.getFrameworkQuestions(projectAnalysis));

    // Add pattern-specific questions
    questions.push(...this.getPatternQuestions(projectAnalysis.patterns));

    // Add architecture-specific questions
    questions.push(
      ...this.getArchitectureQuestions(projectAnalysis.architecture)
    );

    // Add language-specific questions
    questions.push(...this.getLanguageQuestions(projectAnalysis.language));

    // Apply templates based on project context
    const applicableTemplates = this.getApplicableTemplates(projectAnalysis);
    for (const template of applicableTemplates) {
      questions.push(...template.questions);
    }

    // Sort by priority (higher priority first) and remove duplicates
    const uniqueQuestions = this.removeDuplicateQuestions(questions);
    return uniqueQuestions.sort((a, b) => b.priority - a.priority);
  }

  createQuestionnaireSession(
    projectId: string,
    projectContext: ProjectAnalysis,
    questions: Question[]
  ): QuestionnaireSession {
    return {
      id: `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      projectId,
      startedAt: new Date(),
      currentQuestionIndex: 0,
      answers: {},
      questions,
      context: projectContext,
    };
  }

  getNextQuestion(session: QuestionnaireSession): Question | null {
    if (session.currentQuestionIndex >= session.questions.length) {
      return null;
    }

    const question = session.questions[session.currentQuestionIndex];

    // Check if question dependencies are met
    if (question.dependsOn && question.dependsOn.length > 0) {
      const dependenciesMet = question.dependsOn.every(depId => {
        const depAnswer = session.answers[depId];
        return (
          depAnswer !== undefined && depAnswer !== '' && depAnswer !== false
        );
      });

      if (!dependenciesMet) {
        // Skip this question and try the next one
        session.currentQuestionIndex++;
        return this.getNextQuestion(session);
      }
    }

    return question;
  }

  answerQuestion(
    session: QuestionnaireSession,
    questionId: string,
    answer: any
  ): AnswerResult {
    const question = session.questions.find(q => q.id === questionId);
    if (!question) {
      return { success: false, error: 'Question not found' };
    }

    // Validate answer
    const validationResult = this.validateAnswer(question, answer);
    if (!validationResult.valid) {
      return { success: false, error: validationResult.error };
    }

    // Store answer
    session.answers[questionId] = answer;

    // Move to next question
    session.currentQuestionIndex++;

    // Generate follow-up questions if needed
    const followUpQuestions = question.followUpQuestions || [];

    return {
      success: true,
      followUpQuestions,
    };
  }

  async generateFollowUpQuestions(
    session: QuestionnaireSession,
    answeredQuestionId: string
  ): Promise<Question[]> {
    const answeredQuestion = session.questions.find(
      q => q.id === answeredQuestionId
    );
    const answer = session.answers[answeredQuestionId];

    if (!answeredQuestion || !answer) {
      return [];
    }

    const followUpQuestions: Question[] = [];

    // Generate context-specific follow-ups based on the answer
    if (answeredQuestionId === 'authentication-type') {
      if (answer === 'JWT') {
        followUpQuestions.push({
          id: 'jwt-storage',
          text: 'Where will you store JWT tokens?',
          type: 'multiple-choice',
          category: 'technical',
          priority: 7,
          required: true,
          options: [
            'localStorage',
            'sessionStorage',
            'httpOnly cookies',
            'memory',
          ],
          context: { framework: session.context.framework },
        });

        followUpQuestions.push({
          id: 'jwt-refresh',
          text: 'Will you implement refresh tokens?',
          type: 'boolean',
          category: 'technical',
          priority: 6,
          required: false,
          context: { framework: session.context.framework },
        });
      }
    }

    if (answeredQuestionId === 'database-type') {
      if (answer === 'PostgreSQL' || answer === 'MySQL') {
        followUpQuestions.push({
          id: 'orm-choice',
          text: 'Which ORM/Query Builder will you use?',
          type: 'multiple-choice',
          category: 'technical',
          priority: 7,
          required: true,
          options: ['Prisma', 'TypeORM', 'Sequelize', 'Knex.js', 'Raw SQL'],
          context: { framework: session.context.framework },
        });
      }

      if (answer === 'MongoDB') {
        followUpQuestions.push({
          id: 'mongodb-odm',
          text: 'Which MongoDB ODM will you use?',
          type: 'multiple-choice',
          category: 'technical',
          priority: 7,
          required: true,
          options: ['Mongoose', 'MongoDB Native Driver', 'Prisma'],
          context: { framework: session.context.framework },
        });
      }
    }

    if (answeredQuestionId === 'deployment-platform') {
      followUpQuestions.push({
        id: 'ci-cd-pipeline',
        text: 'Do you need a CI/CD pipeline?',
        type: 'boolean',
        category: 'technical',
        priority: 5,
        required: false,
      });

      if (answer === 'AWS' || answer === 'GCP' || answer === 'Azure') {
        followUpQuestions.push({
          id: 'infrastructure-as-code',
          text: 'Will you use Infrastructure as Code?',
          type: 'multiple-choice',
          category: 'technical',
          priority: 4,
          required: false,
          options: ['Terraform', 'CloudFormation', 'Pulumi', 'CDK', 'No'],
        });
      }
    }

    return followUpQuestions;
  }

  isSessionComplete(session: QuestionnaireSession): boolean {
    const requiredQuestions = session.questions.filter(q => q.required);
    const answeredRequired = requiredQuestions.filter(q => {
      const answer = session.answers[q.id];
      return answer !== undefined && answer !== '' && answer !== null;
    });

    return answeredRequired.length === requiredQuestions.length;
  }

  getQuestionsByCategory(
    questions: Question[],
    category: Question['category']
  ): Question[] {
    return questions.filter(q => q.category === category);
  }

  registerTemplate(template: QuestionTemplate): void {
    this.templates.set(template.id, template);
  }

  getApplicableTemplates(projectAnalysis: ProjectAnalysis): QuestionTemplate[] {
    const applicable: QuestionTemplate[] = [];

    for (const template of this.templates.values()) {
      // Check if template applies to the project's frameworks
      if (
        template.applicableFrameworks &&
        template.applicableFrameworks.length > 0
      ) {
        const projectFrameworks = projectAnalysis.framework?.split(', ') || [];
        const hasMatchingFramework = template.applicableFrameworks.some(fw =>
          projectFrameworks.some(pf =>
            pf.toLowerCase().includes(fw.toLowerCase())
          )
        );

        if (hasMatchingFramework) {
          applicable.push(template);
        }
      }

      // Check if template applies to the project's patterns
      if (
        template.applicablePatterns &&
        template.applicablePatterns.length > 0
      ) {
        const hasMatchingPattern = template.applicablePatterns.some(pattern =>
          projectAnalysis.patterns.some(
            p =>
              p.id === pattern ||
              p.name.toLowerCase().includes(pattern.toLowerCase())
          )
        );

        if (hasMatchingPattern) {
          applicable.push(template);
        }
      }

      // Check if template applies to the project's domain
      if (template.applicableDomains && template.applicableDomains.length > 0) {
        // This would need domain detection logic
        // For now, we'll skip domain-based matching
      }
    }

    return applicable;
  }

  private loadDefaultTemplates(): void {
    // Load React template
    this.registerTemplate({
      id: 'react-app',
      name: 'React Application',
      description: 'Questions for React-based applications',
      category: 'frontend',
      questions: [
        {
          id: 'react-routing',
          text: 'Do you need client-side routing in your React application?',
          type: 'boolean',
          category: 'technical',
          priority: 8,
          required: true,
        },
        {
          id: 'state-management',
          text: 'What state management solution will you use?',
          type: 'multiple-choice',
          category: 'technical',
          priority: 8,
          required: true,
          options: [
            'React State (useState/useReducer)',
            'Redux Toolkit',
            'Zustand',
            'Jotai',
            'Context API',
            'None',
          ],
        },
        {
          id: 'styling-approach',
          text: 'How will you handle styling in your React components?',
          type: 'multiple-choice',
          category: 'technical',
          priority: 6,
          required: true,
          options: [
            'CSS Modules',
            'Styled Components',
            'Emotion',
            'Tailwind CSS',
            'SCSS/Sass',
            'Plain CSS',
          ],
        },
      ],
      applicableFrameworks: ['react'],
    });

    // Load Express template
    this.registerTemplate({
      id: 'express-api',
      name: 'Express API',
      description: 'Questions for Express.js APIs',
      category: 'backend',
      questions: [
        {
          id: 'api-authentication',
          text: 'What authentication method will your API use?',
          type: 'multiple-choice',
          category: 'technical',
          priority: 9,
          required: true,
          options: ['JWT', 'Session-based', 'OAuth 2.0', 'API Keys', 'None'],
        },
        {
          id: 'api-validation',
          text: 'How will you validate incoming API requests?',
          type: 'multiple-choice',
          category: 'technical',
          priority: 8,
          required: true,
          options: [
            'Zod',
            'Joi',
            'Express Validator',
            'Yup',
            'Custom validation',
            'None',
          ],
        },
        {
          id: 'error-handling',
          text: 'How will you handle errors in your Express application?',
          type: 'multiple-choice',
          category: 'technical',
          priority: 7,
          required: true,
          options: [
            'Custom error middleware',
            'Error-first callbacks',
            'Try-catch with async/await',
            'Third-party library',
            'Built-in Express error handling',
          ],
        },
      ],
      applicableFrameworks: ['express'],
    });

    // Load TypeScript template
    this.registerTemplate({
      id: 'typescript-project',
      name: 'TypeScript Project',
      description: 'Questions for TypeScript-based projects',
      category: 'language',
      questions: [
        {
          id: 'typescript-config',
          text: 'What TypeScript strictness level will you use?',
          type: 'multiple-choice',
          category: 'technical',
          priority: 6,
          required: true,
          options: [
            'Strict mode (recommended)',
            'Moderate strictness',
            'Loose configuration',
            'Custom configuration',
          ],
        },
        {
          id: 'type-definitions',
          text: 'How will you handle third-party library type definitions?',
          type: 'multiple-choice',
          category: 'technical',
          priority: 5,
          required: false,
          options: [
            '@types packages from DefinitelyTyped',
            'Library built-in types',
            'Custom type declarations',
            'Skip typing for some libraries',
          ],
        },
      ],
      applicableFrameworks: ['typescript'],
    });
  }

  private getBaseQuestions(): Question[] {
    return [
      {
        id: 'project-name',
        text: 'What is the name of your project?',
        type: 'text',
        category: 'business',
        priority: 10,
        required: true,
      },
      {
        id: 'project-description',
        text: 'Provide a brief description of your project (1-2 sentences)',
        type: 'text',
        category: 'business',
        priority: 10,
        required: true,
      },
      {
        id: 'target-users',
        text: 'Who are the primary users of this application?',
        type: 'text',
        category: 'business',
        priority: 9,
        required: true,
      },
      {
        id: 'main-objectives',
        text: 'What are the main objectives this project should achieve?',
        type: 'text',
        category: 'business',
        priority: 9,
        required: true,
      },
      {
        id: 'success-criteria',
        text: 'How will you measure the success of this project?',
        type: 'text',
        category: 'business',
        priority: 8,
        required: true,
      },
    ];
  }

  private getFrameworkQuestions(projectAnalysis: ProjectAnalysis): Question[] {
    const questions: Question[] = [];
    const frameworks = projectAnalysis.framework?.split(', ') || [];

    if (frameworks.includes('react')) {
      questions.push({
        id: 'react-version',
        text: 'Which React features will you use?',
        type: 'multi-select',
        category: 'technical',
        priority: 7,
        required: false,
        options: [
          'Hooks',
          'Context API',
          'Suspense',
          'Concurrent Features',
          'Server Components',
        ],
        context: { framework: 'react' },
      });
    }

    if (frameworks.includes('express')) {
      questions.push({
        id: 'express-middleware',
        text: 'Which Express middleware will you use?',
        type: 'multi-select',
        category: 'technical',
        priority: 7,
        required: false,
        options: [
          'CORS',
          'Body Parser',
          'Rate Limiting',
          'Compression',
          'Security Headers',
          'Logging',
        ],
        context: { framework: 'express' },
      });
    }

    return questions;
  }

  private getPatternQuestions(patterns: CodebasePattern[]): Question[] {
    const questions: Question[] = [];

    const hasServicePattern = patterns.some(p =>
      p.name.toLowerCase().includes('service')
    );
    if (hasServicePattern) {
      questions.push({
        id: 'service-dependencies',
        text: 'How will you manage dependencies between services?',
        type: 'multiple-choice',
        category: 'technical',
        priority: 6,
        required: false,
        options: [
          'Dependency Injection',
          'Service Locator',
          'Factory Pattern',
          'Manual instantiation',
        ],
        context: { pattern: 'service-layer' },
      });
    }

    const hasComponentPattern = patterns.some(p =>
      p.name.toLowerCase().includes('component')
    );
    if (hasComponentPattern) {
      questions.push({
        id: 'component-composition',
        text: 'How will you handle component composition and reusability?',
        type: 'multiple-choice',
        category: 'technical',
        priority: 6,
        required: false,
        options: [
          'Higher-Order Components',
          'Render Props',
          'Custom Hooks',
          'Component Libraries',
          'Compound Components',
        ],
        context: { pattern: 'component-based' },
      });
    }

    return questions;
  }

  private getArchitectureQuestions(architecture: string[]): Question[] {
    const questions: Question[] = [];

    if (architecture.includes('Service-oriented')) {
      questions.push({
        id: 'service-communication',
        text: 'How will services communicate with each other?',
        type: 'multiple-choice',
        category: 'technical',
        priority: 7,
        required: false,
        options: [
          'HTTP/REST',
          'GraphQL',
          'Message Queues',
          'Event Bus',
          'gRPC',
          'Direct function calls',
        ],
      });
    }

    if (architecture.includes('Component-based')) {
      questions.push({
        id: 'component-testing',
        text: 'How will you test your components?',
        type: 'multi-select',
        category: 'technical',
        priority: 6,
        required: false,
        options: [
          'Unit tests',
          'Integration tests',
          'Visual regression tests',
          'E2E tests',
          'Accessibility tests',
        ],
      });
    }

    return questions;
  }

  private getLanguageQuestions(language: string): Question[] {
    const questions: Question[] = [];

    if (language === 'typescript') {
      questions.push({
        id: 'typescript-build',
        text: 'How will you build your TypeScript project?',
        type: 'multiple-choice',
        category: 'technical',
        priority: 6,
        required: true,
        options: [
          'tsc (TypeScript compiler)',
          'Webpack',
          'Vite',
          'esbuild',
          'Rollup',
          'Parcel',
        ],
      });
    }

    if (language === 'javascript' || language === 'typescript') {
      questions.push({
        id: 'package-manager',
        text: 'Which package manager do you prefer?',
        type: 'multiple-choice',
        category: 'technical',
        priority: 5,
        required: false,
        options: ['npm', 'yarn', 'pnpm', 'bun'],
      });
    }

    return questions;
  }

  private removeDuplicateQuestions(questions: Question[]): Question[] {
    const seen = new Set<string>();
    return questions.filter(question => {
      if (seen.has(question.id)) {
        return false;
      }
      seen.add(question.id);
      return true;
    });
  }

  private validateAnswer(
    question: Question,
    answer: any
  ): { valid: boolean; error?: string } {
    // Check required questions
    if (
      question.required &&
      (answer === undefined || answer === '' || answer === null)
    ) {
      return { valid: false, error: 'This question is required' };
    }

    // Validate by type
    switch (question.type) {
      case 'multiple-choice':
        if (question.options && !question.options.includes(answer)) {
          return {
            valid: false,
            error: `Answer must be one of: ${question.options.join(', ')}`,
          };
        }
        break;

      case 'multi-select':
        if (!Array.isArray(answer)) {
          return {
            valid: false,
            error: 'Answer must be an array for multi-select questions',
          };
        }
        if (question.options) {
          for (const selectedOption of answer) {
            if (!question.options.includes(selectedOption)) {
              return {
                valid: false,
                error: `Invalid option: ${selectedOption}`,
              };
            }
          }
        }
        break;

      case 'boolean':
        if (typeof answer !== 'boolean') {
          return { valid: false, error: 'Answer must be true or false' };
        }
        break;

      case 'scale':
        if (typeof answer !== 'number' || answer < 1 || answer > 10) {
          return {
            valid: false,
            error: 'Answer must be a number between 1 and 10',
          };
        }
        break;

      case 'text':
        if (typeof answer !== 'string') {
          return { valid: false, error: 'Answer must be a string' };
        }
        if (question.required && answer.trim().length === 0) {
          return { valid: false, error: 'Answer cannot be empty' };
        }
        break;
    }

    return { valid: true };
  }
}
