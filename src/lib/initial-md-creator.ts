import {
  InitialMdConfig,
  InitialMdTemplate,
  QuestionnaireSession,
  ProjectAnalysis,
} from '../types';

export class InitialMdCreator {
  private templates: Map<string, InitialMdTemplate> = new Map();

  constructor() {
    this.loadDefaultTemplates();
  }

  async createInitialMd(config: InitialMdConfig): Promise<string> {
    // Validate configuration
    this.validateConfig(config);

    // Find appropriate template
    const template = this.selectTemplate(config);

    if (template) {
      return this.renderTemplate(template, config);
    } else {
      return this.createDefaultMarkdown(config);
    }
  }

  async createFromQuestionnaire(
    session: QuestionnaireSession
  ): Promise<string> {
    const config = this.extractConfigFromSession(session);

    // Use lenient validation for questionnaire data
    this.validateConfigLenient(config);

    // Select template and create markdown without strict validation
    const template = this.selectTemplate(config);
    const markdown = template
      ? this.createFromTemplate(template, config)
      : this.createDefaultMarkdown(config);

    // Enhance with codebase analysis insights
    return this.enhanceWithAnalysis(markdown, session.context);
  }

  registerTemplate(template: InitialMdTemplate): void {
    this.templates.set(template.id, template);
  }

  private validateConfig(config: InitialMdConfig): void {
    const errors: string[] = [];

    if (!config.projectName || config.projectName.trim().length === 0) {
      errors.push('Project name is required');
    }

    if (!config.projectType || config.projectType.trim().length === 0) {
      errors.push('Project type is required');
    }

    if (!config.domain || config.domain.trim().length === 0) {
      errors.push('Domain is required');
    }

    if (!config.stakeholders || config.stakeholders.length === 0) {
      errors.push('At least one stakeholder is required');
    }

    if (!config.objectives || config.objectives.length === 0) {
      errors.push('At least one objective is required');
    }

    if (
      !config.technicalRequirements ||
      config.technicalRequirements.length === 0
    ) {
      errors.push('At least one technical requirement is required');
    }

    if (
      !config.businessRequirements ||
      config.businessRequirements.length === 0
    ) {
      errors.push('At least one business requirement is required');
    }

    if (errors.length > 0) {
      throw new Error(`Configuration validation failed: ${errors.join(', ')}`);
    }
  }

  private validateConfigLenient(config: InitialMdConfig): void {
    // Only validate essential fields for questionnaire data
    if (!config.projectName || config.projectName.trim().length === 0) {
      config.projectName = 'Untitled Project';
    }

    if (!config.projectType || config.projectType.trim().length === 0) {
      config.projectType = 'web-application';
    }

    if (!config.domain || config.domain.trim().length === 0) {
      config.domain = 'general';
    }

    // Provide defaults for missing arrays
    if (!config.stakeholders) config.stakeholders = [];
    if (!config.objectives) config.objectives = [];
    if (!config.constraints) config.constraints = [];
    if (!config.technicalRequirements) config.technicalRequirements = [];
    if (!config.businessRequirements) config.businessRequirements = [];
  }

  private selectTemplate(config: InitialMdConfig): InitialMdTemplate | null {
    // Find template that best matches the configuration
    for (const template of this.templates.values()) {
      if (
        template.framework &&
        config.framework &&
        config.framework
          .toLowerCase()
          .includes(template.framework.toLowerCase())
      ) {
        return template;
      }

      if (template.domain && config.domain === template.domain) {
        return template;
      }
    }

    return null;
  }

  private createFromTemplate(
    template: InitialMdTemplate,
    config: InitialMdConfig
  ): string {
    return this.renderTemplate(template, config);
  }

  private renderTemplate(
    template: InitialMdTemplate,
    config: InitialMdConfig
  ): string {
    let content = template.template;

    // Replace placeholders with actual values
    content = content.replace(/{{projectName}}/g, config.projectName);
    content = content.replace(/{{projectType}}/g, config.projectType);
    content = content.replace(/{{domain}}/g, config.domain);
    content = content.replace(
      /{{framework}}/g,
      config.framework || 'Not specified'
    );

    // Handle list replacements
    content = this.replaceBulletList(
      content,
      'stakeholders',
      config.stakeholders
    );
    content = this.replaceBulletList(
      content,
      'constraints',
      config.constraints
    );
    content = this.replaceBulletList(content, 'objectives', config.objectives);
    content = this.replaceBulletList(
      content,
      'technicalRequirements',
      config.technicalRequirements
    );
    content = this.replaceBulletList(
      content,
      'businessRequirements',
      config.businessRequirements
    );

    // Handle custom sections
    if (config.customSections) {
      const customSectionsMarkdown = config.customSections
        .map(section => `\n## ${section.title}\n\n${section.content}\n`)
        .join('');
      content += customSectionsMarkdown;
    }

    return content;
  }

  private createDefaultMarkdown(config: InitialMdConfig): string {
    const sections: string[] = [];

    // Project header
    sections.push(`# ${config.projectName}\n`);

    // Project overview
    sections.push('## Project Overview\n');
    sections.push(`**Project Type:** ${config.projectType}\n`);
    if (config.framework) {
      sections.push(`**Framework/Technology:** ${config.framework}\n`);
    }
    sections.push(`**Domain:** ${config.domain}\n`);

    // Stakeholders
    if (config.stakeholders.length > 0) {
      sections.push('\n## Stakeholders\n');
      sections.push(config.stakeholders.map(s => `- ${s}`).join('\n') + '\n');
    }

    // Objectives
    if (config.objectives.length > 0) {
      sections.push('\n## Objectives\n');
      sections.push(config.objectives.map(o => `- ${o}`).join('\n') + '\n');
    }

    // Constraints
    if (config.constraints.length > 0) {
      sections.push('\n## Constraints\n');
      sections.push(config.constraints.map(c => `- ${c}`).join('\n') + '\n');
    }

    // Technical Requirements
    if (config.technicalRequirements.length > 0) {
      sections.push('\n## Technical Requirements\n');
      sections.push(
        config.technicalRequirements.map(r => `- ${r}`).join('\n') + '\n'
      );
    }

    // Business Requirements
    if (config.businessRequirements.length > 0) {
      sections.push('\n## Business Requirements\n');
      sections.push(
        config.businessRequirements.map(r => `- ${r}`).join('\n') + '\n'
      );
    }

    // Add framework-specific sections
    this.addFrameworkSpecificSections(sections, config);

    // Custom sections
    if (config.customSections) {
      for (const section of config.customSections) {
        sections.push(`\n## ${section.title}\n`);
        sections.push(`${section.content}\n`);
      }
    }

    // Success criteria
    sections.push('\n## Success Criteria\n');
    sections.push('Define measurable criteria for project success:\n');
    sections.push('- [ ] Objective 1 measurement\n');
    sections.push('- [ ] Objective 2 measurement\n');
    sections.push('- [ ] User satisfaction metrics\n');

    return sections.join('');
  }

  private addFrameworkSpecificSections(
    sections: string[],
    config: InitialMdConfig
  ): void {
    if (!config.framework) return;

    const framework = config.framework.toLowerCase();

    if (framework.includes('react')) {
      sections.push('\n## React-Specific Considerations\n');
      sections.push('- Component architecture and reusability\n');
      sections.push('- State management strategy\n');
      sections.push('- Performance optimization (memoization, lazy loading)\n');
      sections.push('- Accessibility compliance\n');
      sections.push('- Testing strategy (unit, integration, e2e)\n');
    }

    if (framework.includes('express')) {
      sections.push('\n## API Design Considerations\n');
      sections.push('- RESTful API design principles\n');
      sections.push('- Authentication and authorization strategy\n');
      sections.push('- Input validation and sanitization\n');
      sections.push('- Error handling and logging\n');
      sections.push('- Rate limiting and security measures\n');
      sections.push('- API documentation (OpenAPI/Swagger)\n');
    }

    if (framework.includes('node')) {
      sections.push('\n## Node.js Considerations\n');
      sections.push('- Scalability and performance\n');
      sections.push('- Memory management\n');
      sections.push('- Async/await patterns\n');
      sections.push('- Process management and clustering\n');
      sections.push('- Monitoring and health checks\n');
    }

    if (framework.includes('typescript')) {
      sections.push('\n## TypeScript Considerations\n');
      sections.push('- Type safety and strict configuration\n');
      sections.push('- Interface and type definitions\n');
      sections.push('- Generic programming patterns\n');
      sections.push('- Build configuration and tooling\n');
    }

    if (
      framework.includes('database') ||
      framework.includes('sql') ||
      framework.includes('mongodb')
    ) {
      sections.push('\n## Data Management\n');
      sections.push('- Database schema design\n');
      sections.push('- Data validation and constraints\n');
      sections.push('- Migration strategy\n');
      sections.push('- Backup and disaster recovery\n');
      sections.push('- Performance optimization (indexes, queries)\n');
    }
  }

  private extractConfigFromSession(
    session: QuestionnaireSession
  ): InitialMdConfig {
    const answers = session.answers;

    // Extract basic information
    const projectName = answers['project-name'] || 'Untitled Project';
    const projectDescription = answers['project-description'] || '';
    const targetUsers = answers['target-users'] || '';
    const mainObjectives = answers['main-objectives'] || '';
    const successCriteria = answers['success-criteria'] || '';

    // Determine project type based on framework and context
    let projectType = 'application';
    if (session.context.framework?.includes('react')) {
      projectType = 'web-application';
    } else if (session.context.framework?.includes('express')) {
      projectType = 'api-service';
    } else if (session.context.framework?.includes('mobile')) {
      projectType = 'mobile-application';
    }

    // Extract technical details
    const technicalRequirements: string[] = [];
    const businessRequirements: string[] = [];

    if (projectDescription) {
      businessRequirements.push(projectDescription);
    }

    // Framework-specific requirements
    if (session.context.framework) {
      technicalRequirements.push(`Framework: ${session.context.framework}`);
    }

    if (session.context.language) {
      technicalRequirements.push(`Language: ${session.context.language}`);
    }

    // Add requirements based on specific answers
    if (answers['authentication-type']) {
      technicalRequirements.push(
        `Authentication: ${answers['authentication-type']}`
      );
    }

    if (answers['database-type']) {
      technicalRequirements.push(`Database: ${answers['database-type']}`);
    }

    if (answers['state-management']) {
      technicalRequirements.push(
        `State Management: ${answers['state-management']}`
      );
    }

    if (answers['api-validation']) {
      technicalRequirements.push(
        `API Validation: ${answers['api-validation']}`
      );
    }

    if (answers['deployment-platform']) {
      technicalRequirements.push(
        `Deployment: ${answers['deployment-platform']}`
      );
    }

    // Extract stakeholders
    const stakeholders: string[] = [];
    if (targetUsers) {
      const userTypes = targetUsers.split(',').map(u => u.trim());
      stakeholders.push(...userTypes);
    }

    if (answers['project-manager'] || answers['development-team']) {
      stakeholders.push('Development Team');
    }

    if (stakeholders.length === 0) {
      stakeholders.push('End Users', 'Development Team');
    }

    // Extract objectives
    const objectives: string[] = [];
    if (mainObjectives) {
      objectives.push(mainObjectives);
    }
    if (successCriteria) {
      objectives.push(`Success Criteria: ${successCriteria}`);
    }
    if (objectives.length === 0) {
      objectives.push(
        'Deliver functional application',
        'Meet user requirements'
      );
    }

    // Extract constraints
    const constraints: string[] = [];
    if (answers['budget-constraint']) {
      constraints.push(`Budget: ${answers['budget-constraint']}`);
    }
    if (answers['timeline-constraint']) {
      constraints.push(`Timeline: ${answers['timeline-constraint']}`);
    }
    if (answers['technology-constraints']) {
      constraints.push(`Technology: ${answers['technology-constraints']}`);
    }
    if (constraints.length === 0) {
      constraints.push(
        'Development timeline',
        'Technical standards compliance'
      );
    }

    // Determine domain
    let domain = 'general';
    if (
      projectName.toLowerCase().includes('e-commerce') ||
      projectName.toLowerCase().includes('shop')
    ) {
      domain = 'e-commerce';
    } else if (
      projectName.toLowerCase().includes('blog') ||
      projectName.toLowerCase().includes('cms')
    ) {
      domain = 'content-management';
    } else if (
      projectName.toLowerCase().includes('task') ||
      projectName.toLowerCase().includes('todo')
    ) {
      domain = 'productivity';
    }

    return {
      projectName,
      projectType,
      framework: session.context.framework,
      domain,
      stakeholders,
      constraints,
      objectives,
      technicalRequirements,
      businessRequirements,
    };
  }

  private enhanceWithAnalysis(
    markdown: string,
    analysis: ProjectAnalysis
  ): string {
    const enhancements: string[] = [];

    // Add current architecture section
    if (analysis.architecture.length > 0) {
      enhancements.push('\n## Current Architecture\n');
      enhancements.push(
        analysis.architecture.map(a => `- ${a}`).join('\n') + '\n'
      );
    }

    // Add detected patterns
    if (analysis.patterns.length > 0) {
      enhancements.push('\n## Detected Patterns\n');
      for (const pattern of analysis.patterns) {
        enhancements.push(
          `- **${pattern.name}**: ${pattern.description} (${Math.round(pattern.confidence * 100)}% confidence)\n`
        );
      }
    }

    // Add technology stack
    const dependencies = Object.keys(analysis.dependencies);
    if (dependencies.length > 0) {
      enhancements.push('\n## Technology Stack\n');
      enhancements.push('**Dependencies:**\n');
      for (const dep of dependencies.slice(0, 10)) {
        // Limit to top 10
        enhancements.push(`- ${dep}: ${analysis.dependencies[dep]}\n`);
      }
    }

    // Add conventions
    enhancements.push('\n## Code Conventions\n');
    enhancements.push(
      `- **Naming Convention**: ${analysis.conventions.naming}\n`
    );
    enhancements.push(`- **Import Style**: ${analysis.conventions.imports}\n`);
    if (analysis.conventions.structure.length > 0) {
      enhancements.push('- **Directory Structure**:\n');
      enhancements.push(
        analysis.conventions.structure.map(s => `  - ${s}`).join('\n') + '\n'
      );
    }

    // Add recommendations
    if (analysis.recommendations.length > 0) {
      enhancements.push('\n## Recommendations\n');
      enhancements.push('Based on codebase analysis:\n');
      enhancements.push(
        analysis.recommendations.map(r => `- ${r}`).join('\n') + '\n'
      );
    }

    // Insert enhancements before success criteria or at the end
    const successCriteriaIndex = markdown.indexOf('## Success Criteria');
    if (successCriteriaIndex !== -1) {
      return (
        markdown.slice(0, successCriteriaIndex) +
        enhancements.join('') +
        markdown.slice(successCriteriaIndex)
      );
    } else {
      return markdown + enhancements.join('');
    }
  }

  private replaceBulletList(
    content: string,
    placeholder: string,
    items: string[]
  ): string {
    const pattern = new RegExp(
      `{{#${placeholder}}}([\\s\\S]*?){{/${placeholder}}}`,
      'g'
    );
    return content.replace(pattern, (match, template) => {
      return items.map(item => template.replace('{{.}}', item)).join('');
    });
  }

  private loadDefaultTemplates(): void {
    // Web Application Template
    this.registerTemplate({
      id: 'web-application',
      name: 'Web Application',
      description: 'Standard web application template',
      template: `# {{projectName}}

## Project Overview

**Type:** Web Application
**Framework:** {{framework}}
**Domain:** {{domain}}

## Stakeholders
{{#stakeholders}}
- {{.}}
{{/stakeholders}}

## Objectives
{{#objectives}}
- {{.}}
{{/objectives}}

## Constraints
{{#constraints}}
- {{.}}
{{/constraints}}

## Technical Requirements
{{#technicalRequirements}}
- {{.}}
{{/technicalRequirements}}

## Business Requirements
{{#businessRequirements}}
- {{.}}
{{/businessRequirements}}

## User Experience Considerations
- Responsive design for mobile and desktop
- Intuitive navigation and user flow
- Accessibility compliance (WCAG 2.1)
- Performance optimization for fast loading
- Cross-browser compatibility

## Security Considerations
- Input validation and sanitization
- Authentication and authorization
- Data encryption in transit and at rest
- Protection against common vulnerabilities (OWASP Top 10)
- Regular security audits and updates

## Development Standards
- Code quality and maintainability
- Comprehensive testing strategy
- Version control and collaborative development
- Documentation and knowledge sharing
- Continuous integration and deployment

## Success Criteria
- [ ] All functional requirements implemented
- [ ] Performance benchmarks met
- [ ] Security standards compliance
- [ ] User acceptance testing passed
- [ ] Deployment and monitoring successful`,
      placeholders: [
        'projectName',
        'framework',
        'domain',
        'stakeholders',
        'objectives',
        'constraints',
        'technicalRequirements',
        'businessRequirements',
      ],
      requiredQuestions: ['project-name', 'framework', 'domain'],
    });

    // API Service Template
    this.registerTemplate({
      id: 'api-service',
      name: 'API Service',
      description: 'REST API service template',
      template: `# {{projectName}}

## Service Overview

**Type:** API Service
**Framework:** {{framework}}
**Domain:** {{domain}}

## API Stakeholders
{{#stakeholders}}
- {{.}}
{{/stakeholders}}

## Service Objectives
{{#objectives}}
- {{.}}
{{/objectives}}

## Technical Constraints
{{#constraints}}
- {{.}}
{{/constraints}}

## API Requirements
{{#technicalRequirements}}
- {{.}}
{{/technicalRequirements}}

## Business Logic Requirements
{{#businessRequirements}}
- {{.}}
{{/businessRequirements}}

## API Design Principles
- RESTful architecture with clear resource endpoints
- Consistent error handling and status codes
- Comprehensive input validation
- Rate limiting and throttling
- API versioning strategy
- Comprehensive documentation (OpenAPI/Swagger)

## Data Management
- Database schema design and optimization
- Data validation and integrity constraints
- Migration and backup strategies
- Performance monitoring and optimization

## Security & Authentication
- Authentication mechanism (JWT, OAuth, etc.)
- Authorization and access control
- Input sanitization and validation
- Protection against API vulnerabilities
- Audit logging and monitoring

## Performance & Scalability
- Response time requirements
- Throughput and concurrency handling
- Caching strategies
- Load balancing considerations
- Monitoring and alerting

## Success Criteria
- [ ] All endpoints implemented and tested
- [ ] Performance benchmarks achieved
- [ ] Security requirements met
- [ ] Documentation complete
- [ ] Production deployment successful`,
      placeholders: [
        'projectName',
        'framework',
        'domain',
        'stakeholders',
        'objectives',
        'constraints',
        'technicalRequirements',
        'businessRequirements',
      ],
      requiredQuestions: ['project-name', 'api-type', 'domain'],
    });

    // Mobile Application Template
    this.registerTemplate({
      id: 'mobile-app',
      name: 'Mobile Application',
      description: 'Mobile application template',
      framework: 'react-native',
      domain: 'mobile',
      template: `# {{projectName}}

## Mobile Application Overview

**Platform:** {{framework}}
**Target Platforms:** iOS, Android
**Domain:** {{domain}}

## Mobile Stakeholders
{{#stakeholders}}
- {{.}}
{{/stakeholders}}

## App Objectives
{{#objectives}}
- {{.}}
{{/objectives}}

## Platform Constraints
{{#constraints}}
- {{.}}
{{/constraints}}

## Technical Requirements
{{#technicalRequirements}}
- {{.}}
{{/technicalRequirements}}

## Business Requirements
{{#businessRequirements}}
- {{.}}
{{/businessRequirements}}

## Mobile-Specific Considerations
- Native platform integration (iOS/Android APIs)
- Offline functionality and data synchronization
- Push notification strategy
- App store compliance and guidelines
- Device compatibility and testing
- Performance optimization for mobile devices

## User Experience
- Mobile-first design principles
- Touch-friendly interface design
- Navigation patterns (tab, stack, drawer)
- Loading states and error handling
- Accessibility for mobile users

## Development & Deployment
- Development environment setup
- Testing strategy (unit, integration, e2e)
- Code signing and certificate management
- App store submission process
- Over-the-air updates mechanism

## Success Criteria
- [ ] Cross-platform compatibility achieved
- [ ] App store approval obtained
- [ ] Performance requirements met
- [ ] User acceptance testing passed
- [ ] Analytics and monitoring implemented`,
      placeholders: [
        'projectName',
        'framework',
        'domain',
        'stakeholders',
        'objectives',
        'constraints',
        'technicalRequirements',
        'businessRequirements',
      ],
      requiredQuestions: ['project-name', 'mobile-platforms', 'domain'],
    });
  }
}
