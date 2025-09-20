import { InitialMdCreator } from '../src/lib/initial-md-creator';
import { InitialMdConfig, InitialMdTemplate, QuestionnaireSession } from '../src/types';

describe('InitialMdCreator', () => {
  let creator: InitialMdCreator;

  beforeEach(() => {
    creator = new InitialMdCreator();
  });

  describe('createInitialMd', () => {
    it('should create INITIAL.md from configuration', async () => {
      const config: InitialMdConfig = {
        projectName: 'Task Management App',
        projectType: 'web-application',
        framework: 'react',
        domain: 'productivity',
        stakeholders: ['End Users', 'Product Manager', 'Development Team'],
        constraints: ['Must be mobile-responsive', 'GDPR compliant', 'Budget: $50,000'],
        objectives: [
          'Increase user productivity by 30%',
          'Reduce task completion time',
          'Improve team collaboration',
        ],
        technicalRequirements: [
          'React frontend with TypeScript',
          'Node.js/Express backend',
          'PostgreSQL database',
          'Real-time updates',
        ],
        businessRequirements: [
          'User registration and authentication',
          'Task creation and management',
          'Team collaboration features',
          'Progress tracking and reporting',
        ],
      };

      const markdown = await creator.createInitialMd(config);

      expect(markdown).toBeDefined();
      expect(typeof markdown).toBe('string');
      expect(markdown).toContain('# Task Management App');
      expect(markdown).toContain('## Project Overview');
      expect(markdown).toContain('## Stakeholders');
      expect(markdown).toContain('## Objectives');
      expect(markdown).toContain('## Constraints');
      expect(markdown).toContain('## Technical Requirements');
      expect(markdown).toContain('## Business Requirements');
      expect(markdown).toContain('End Users');
      expect(markdown).toContain('React frontend with TypeScript');
    });

    it('should handle custom sections', async () => {
      const config: InitialMdConfig = {
        projectName: 'E-commerce Platform',
        projectType: 'web-application',
        domain: 'e-commerce',
        stakeholders: ['Customers', 'Vendors'],
        constraints: ['PCI compliance required'],
        objectives: ['Increase sales conversion'],
        technicalRequirements: ['Payment gateway integration'],
        businessRequirements: ['Product catalog management'],
        customSections: [
          {
            title: 'Security Requirements',
            content: 'All payment data must be encrypted and PCI DSS compliant.',
          },
          {
            title: 'Performance Requirements',
            content: 'Page load times must be under 2 seconds.',
          },
        ],
      };

      const markdown = await creator.createInitialMd(config);

      expect(markdown).toContain('## Security Requirements');
      expect(markdown).toContain('## Performance Requirements');
      expect(markdown).toContain('PCI DSS compliant');
      expect(markdown).toContain('under 2 seconds');
    });
  });

  describe('createFromQuestionnaire', () => {
    it('should create INITIAL.md from questionnaire session', async () => {
      const mockSession: QuestionnaireSession = {
        id: 'test-session',
        projectId: 'test-project',
        startedAt: new Date(),
        currentQuestionIndex: 10,
        answers: {
          'project-name': 'Customer Portal',
          'project-description': 'A self-service portal for customer support',
          'target-users': 'External customers and support agents',
          'main-objectives': 'Reduce support ticket volume by 40%',
          'success-criteria': 'Customer satisfaction score > 4.5/5',
          'authentication-type': 'OAuth 2.0',
          'database-type': 'PostgreSQL',
          'deployment-platform': 'AWS',
          'react-routing': true,
          'state-management': 'Redux Toolkit',
          'api-validation': 'Zod',
        },
        questions: [],
        context: {
          rootPath: '/test',
          language: 'typescript',
          framework: 'react, express',
          architecture: ['Component-based', 'Service-oriented'],
          dependencies: { react: '^18.0.0' },
          devDependencies: { typescript: '^5.0.0' },
          fileAnalyses: [],
          patterns: [],
          conventions: { naming: 'camelCase', structure: [], imports: 'relative' },
          recommendations: [],
          generatedAt: new Date(),
        },
      };

      const markdown = await creator.createFromQuestionnaire(mockSession);

      expect(markdown).toBeDefined();
      expect(markdown).toContain('# Customer Portal');
      expect(markdown).toContain('A self-service portal for customer support');
      expect(markdown).toContain('External customers and support agents');
      expect(markdown).toContain('OAuth 2.0');
      expect(markdown).toContain('PostgreSQL');
      expect(markdown).toContain('Redux Toolkit');
    });

    it('should handle missing or incomplete questionnaire data', async () => {
      const mockSession: QuestionnaireSession = {
        id: 'incomplete-session',
        projectId: 'test-project',
        startedAt: new Date(),
        currentQuestionIndex: 2,
        answers: {
          'project-name': 'Minimal App',
        },
        questions: [],
        context: {
          rootPath: '/test',
          language: 'javascript',
          architecture: [],
          dependencies: {},
          devDependencies: {},
          fileAnalyses: [],
          patterns: [],
          conventions: { naming: 'mixed', structure: [], imports: 'mixed' },
          recommendations: [],
          generatedAt: new Date(),
        },
      };

      const markdown = await creator.createFromQuestionnaire(mockSession);

      expect(markdown).toBeDefined();
      expect(markdown).toContain('# Minimal App');
      // Should handle missing data gracefully
      expect(markdown).toContain('## Project Overview');
    });
  });

  describe('template management', () => {
    it('should register and use custom templates', async () => {
      const template: InitialMdTemplate = {
        id: 'mobile-app',
        name: 'Mobile Application',
        description: 'Template for mobile applications',
        framework: 'react-native',
        domain: 'mobile',
        template: `# {{projectName}}

## Mobile-Specific Requirements
{{#mobilePlatforms}}
- {{.}}
{{/mobilePlatforms}}

## App Store Requirements
{{appStoreRequirements}}`,
        placeholders: ['projectName', 'mobilePlatforms', 'appStoreRequirements'],
        requiredQuestions: ['project-name', 'mobile-platforms', 'app-store-requirements'],
      };

      creator.registerTemplate(template);

      const config: InitialMdConfig = {
        projectName: 'Shopping App',
        projectType: 'mobile-application',
        framework: 'react-native',
        domain: 'e-commerce',
        stakeholders: ['Mobile users'],
        constraints: ['iOS and Android compatibility'],
        objectives: ['Increase mobile sales'],
        technicalRequirements: ['Push notifications', 'Offline mode'],
        businessRequirements: ['In-app purchases'],
      };

      // This would use the mobile template if framework matches
      const markdown = await creator.createInitialMd(config);
      expect(markdown).toBeDefined();
    });
  });

  describe('validation', () => {
    it('should validate configuration before creating markdown', async () => {
      const invalidConfig: Partial<InitialMdConfig> = {
        // Missing required fields
        projectType: 'web-application',
        domain: 'test',
        stakeholders: [],
        constraints: [],
        objectives: [],
        technicalRequirements: [],
        businessRequirements: [],
      };

      await expect(
        creator.createInitialMd(invalidConfig as InitialMdConfig)
      ).rejects.toThrow();
    });

    it('should provide helpful error messages for validation failures', async () => {
      const configWithEmptyName: InitialMdConfig = {
        projectName: '', // Empty name
        projectType: 'web-application',
        domain: 'test',
        stakeholders: ['User'],
        constraints: ['Budget'],
        objectives: ['Goal'],
        technicalRequirements: ['Tech'],
        businessRequirements: ['Business'],
      };

      await expect(
        creator.createInitialMd(configWithEmptyName)
      ).rejects.toThrow(/project name/i);
    });
  });

  describe('content quality', () => {
    it('should generate well-formatted markdown', async () => {
      const config: InitialMdConfig = {
        projectName: 'Test Project',
        projectType: 'web-application',
        domain: 'testing',
        stakeholders: ['Tester'],
        constraints: ['Time limit'],
        objectives: ['Test completion'],
        technicalRequirements: ['Testing framework'],
        businessRequirements: ['Test coverage'],
      };

      const markdown = await creator.createInitialMd(config);

      // Check for proper markdown formatting
      expect(markdown).toMatch(/^# /m); // Has main title
      expect(markdown).toMatch(/^## /m); // Has section headers
      expect(markdown).toMatch(/^- /m); // Has bullet points

      // Check for no empty sections
      const lines = markdown.split('\n');
      const sectionHeaderLines = lines
        .map((line, index) => ({ line, index }))
        .filter(({ line }) => line.startsWith('## '));

      for (const { line, index } of sectionHeaderLines) {
        // Check if there's content after the header
        const nextLines = lines.slice(index + 1, index + 5);
        const hasContent = nextLines.some(nextLine =>
          nextLine.trim().length > 0 && !nextLine.startsWith('##')
        );
        expect(hasContent).toBe(true);
      }
    });

    it('should include contextual recommendations based on framework', async () => {
      const reactConfig: InitialMdConfig = {
        projectName: 'React App',
        projectType: 'web-application',
        framework: 'react',
        domain: 'web',
        stakeholders: ['Users'],
        constraints: ['Modern browsers'],
        objectives: ['User engagement'],
        technicalRequirements: ['Component-based architecture'],
        businessRequirements: ['Interactive UI'],
      };

      const markdown = await creator.createInitialMd(reactConfig);

      // Should include React-specific considerations
      expect(markdown.toLowerCase()).toContain('component');
      expect(markdown.toLowerCase()).toContain('react');
    });
  });

  describe('integration with project analysis', () => {
    it('should incorporate insights from codebase analysis', async () => {
      const sessionWithAnalysis: QuestionnaireSession = {
        id: 'analysis-session',
        projectId: 'analyzed-project',
        startedAt: new Date(),
        currentQuestionIndex: 5,
        answers: {
          'project-name': 'Analyzed Project',
          'project-description': 'A project with existing codebase',
        },
        questions: [],
        context: {
          rootPath: '/project',
          language: 'typescript',
          framework: 'react, express',
          architecture: ['Component-based', 'Service Layer'],
          dependencies: {
            'react': '^18.0.0',
            'express': '^4.18.0',
            'zod': '^3.20.0',
          },
          devDependencies: { 'typescript': '^5.0.0' },
          fileAnalyses: [],
          patterns: [
            {
              id: 'service-pattern',
              name: 'Service Layer',
              description: 'Service layer detected',
              type: 'architectural',
              confidence: 0.8,
              examples: [],
              recommendations: ['Consider dependency injection'],
            },
          ],
          conventions: {
            naming: 'camelCase',
            structure: ['src', 'components', 'services'],
            imports: 'relative',
          },
          recommendations: [
            'Consider adding input validation',
            'Implement error boundaries',
          ],
          generatedAt: new Date(),
        },
      };

      const markdown = await creator.createFromQuestionnaire(sessionWithAnalysis);

      expect(markdown).toBeDefined();
      expect(markdown).toContain('## Current Architecture');
      expect(markdown).toContain('Service Layer');
      expect(markdown).toContain('## Technology Stack');
      expect(markdown).toContain('React');
      expect(markdown).toContain('Express');
      expect(markdown).toContain('## Recommendations');
      expect(markdown).toContain('dependency injection');
    });
  });
});