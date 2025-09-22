import {
  PRPExecutionGuidance,
  AgentRecommendation,
  TaskGroup,
  ExecutionTask,
  RiskAssessment,
  Risk,
  ImplementationPhase,
  TechnologyRecommendation,
} from '../types/index.js';

/**
 * ExecutionGuidance provides intelligent analysis of PRPs to generate
 * actionable guidance for implementation using the LOCOMOTIVE agent system.
 *
 * This replicates Cole Medin's expertise in breaking down complex requirements
 * into manageable tasks with appropriate agent assignments.
 */
export class ExecutionGuidance {
  private readonly AGENT_TYPES = {
    backend: {
      skills: [
        'API development',
        'Database design',
        'Server-side logic',
        'Security',
      ],
      specializations: ['Node.js', 'Python', 'Java', 'Go', 'Database systems'],
    },
    frontend: {
      skills: [
        'UI development',
        'React/Vue/Angular',
        'Responsive design',
        'State management',
      ],
      specializations: [
        'React',
        'Vue',
        'Angular',
        'Mobile development',
        'UI/UX',
      ],
    },
    fullstack: {
      skills: [
        'End-to-end development',
        'Integration',
        'Architecture',
        'Problem solving',
      ],
      specializations: [
        'MEAN/MERN',
        'Django',
        'Rails',
        'Full-stack integration',
      ],
    },
    devops: {
      skills: [
        'Deployment',
        'CI/CD',
        'Infrastructure',
        'Monitoring',
        'Security',
      ],
      specializations: ['AWS', 'Docker', 'Kubernetes', 'Terraform', 'Jenkins'],
    },
    'ml-engineer': {
      skills: ['ML pipelines', 'Model deployment', 'Data processing', 'MLOps'],
      specializations: [
        'TensorFlow',
        'PyTorch',
        'Scikit-learn',
        'Kubeflow',
        'MLflow',
      ],
    },
    'data-scientist': {
      skills: [
        'Data analysis',
        'Model development',
        'Statistical analysis',
        'Visualization',
      ],
      specializations: [
        'Python',
        'R',
        'Jupyter',
        'Statistical modeling',
        'Domain expertise',
      ],
    },
    security: {
      skills: [
        'Security audit',
        'Penetration testing',
        'Compliance',
        'Threat modeling',
      ],
      specializations: [
        'OWASP',
        'Cryptography',
        'Compliance frameworks',
        'Security tools',
      ],
    },
    'qa-engineer': {
      skills: [
        'Test automation',
        'Quality assurance',
        'Performance testing',
        'Bug tracking',
      ],
      specializations: ['Selenium', 'Jest', 'Load testing', 'Mobile testing'],
    },
    'ui-ux': {
      skills: [
        'User experience design',
        'Interface design',
        'Usability testing',
        'Prototyping',
      ],
      specializations: [
        'Figma',
        'Adobe Creative Suite',
        'User research',
        'Accessibility',
      ],
    },
    architect: {
      skills: [
        'System design',
        'Architecture patterns',
        'Scalability',
        'Technical leadership',
      ],
      specializations: [
        'Microservices',
        'Event-driven systems',
        'Cloud architecture',
        'Performance',
      ],
    },
  };

  private readonly TECHNOLOGY_RECOMMENDATIONS = {
    frontend: [
      {
        tech: 'React',
        confidence: 0.9,
        alternatives: ['Vue.js', 'Angular', 'Svelte'],
      },
      {
        tech: 'TypeScript',
        confidence: 0.95,
        alternatives: ['JavaScript', 'Flow'],
      },
      {
        tech: 'Next.js',
        confidence: 0.8,
        alternatives: ['Gatsby', 'Nuxt.js', 'Create React App'],
      },
    ],
    backend: [
      {
        tech: 'Node.js',
        confidence: 0.85,
        alternatives: ['Python', 'Java', 'Go'],
      },
      {
        tech: 'Express.js',
        confidence: 0.8,
        alternatives: ['Fastify', 'Koa', 'NestJS'],
      },
      {
        tech: 'FastAPI',
        confidence: 0.9,
        alternatives: ['Django', 'Flask', 'Express'],
      },
    ],
    database: [
      {
        tech: 'PostgreSQL',
        confidence: 0.9,
        alternatives: ['MySQL', 'MongoDB', 'SQLite'],
      },
      {
        tech: 'Redis',
        confidence: 0.85,
        alternatives: ['Memcached', 'DynamoDB'],
      },
      {
        tech: 'MongoDB',
        confidence: 0.75,
        alternatives: ['PostgreSQL', 'CouchDB'],
      },
    ],
    deployment: [
      {
        tech: 'Docker',
        confidence: 0.95,
        alternatives: ['Podman', 'containerd'],
      },
      {
        tech: 'AWS',
        confidence: 0.85,
        alternatives: ['Google Cloud', 'Azure', 'DigitalOcean'],
      },
      {
        tech: 'Kubernetes',
        confidence: 0.8,
        alternatives: ['Docker Swarm', 'Nomad'],
      },
    ],
    monitoring: [
      {
        tech: 'Prometheus',
        confidence: 0.85,
        alternatives: ['DataDog', 'New Relic', 'Grafana'],
      },
      {
        tech: 'ELK Stack',
        confidence: 0.8,
        alternatives: ['Splunk', 'Fluentd'],
      },
    ],
    testing: [
      {
        tech: 'Jest',
        confidence: 0.9,
        alternatives: ['Mocha', 'Vitest', 'Cypress'],
      },
      {
        tech: 'Cypress',
        confidence: 0.85,
        alternatives: ['Playwright', 'Selenium'],
      },
    ],
  };

  /**
   * Generate comprehensive execution guidance from a PRP
   */
  async generateExecutionGuidance(
    prpContent: string
  ): Promise<PRPExecutionGuidance> {
    const analysis = await this.analyzePRP(prpContent);

    const agentRecommendations =
      await this.generateAgentRecommendations(analysis);
    const taskBreakdown = await this.generateTaskBreakdown(analysis);
    const riskAssessment = await this.assessRisks(analysis);
    const implementationOrder = await this.planImplementationPhases(
      analysis,
      taskBreakdown
    );
    const technologyStack = await this.recommendTechnologies(analysis);

    const complexity = this.assessComplexity(analysis);
    const duration = this.estimateDuration(analysis, complexity);

    return {
      agentRecommendations,
      taskBreakdown,
      riskAssessment,
      implementationOrder,
      technologyStack,
      estimatedComplexity: complexity,
      estimatedDuration: duration,
    };
  }

  /**
   * Analyze PRP content to extract key characteristics
   */
  private async analyzePRP(content: string): Promise<any> {
    const sections = this.extractSections(content);

    return {
      sections,
      projectType: this.identifyProjectType(content),
      technologies: this.extractTechnologies(content),
      requirements: this.extractRequirements(content),
      constraints: this.extractConstraints(content),
      stakeholders: this.extractStakeholders(content),
      phases: this.extractPhases(content),
      domain: this.identifyDomain(content),
      scale: this.assessScale(content),
    };
  }

  /**
   * Extract sections from PRP content
   */
  private extractSections(content: string): Record<string, string> {
    const sections: Record<string, string> = {};
    const lines = content.split('\n');
    let currentSection = '';
    let currentContent: string[] = [];

    for (const line of lines) {
      const trimmedLine = line.trim();

      if (trimmedLine.startsWith('##')) {
        if (currentSection) {
          sections[currentSection.toLowerCase()] = currentContent
            .join('\n')
            .trim();
        }
        currentSection = trimmedLine
          .replace(/^#+\s*/, '')
          .replace(/[*:]/g, '')
          .trim();
        currentContent = [];
      } else if (currentSection) {
        currentContent.push(line);
      }
    }

    if (currentSection) {
      sections[currentSection.toLowerCase()] = currentContent.join('\n').trim();
    }

    return sections;
  }

  /**
   * Identify the type of project from content analysis
   */
  private identifyProjectType(content: string): string {
    const lowerContent = content.toLowerCase();

    if (
      lowerContent.includes('machine learning') ||
      lowerContent.includes('ml') ||
      lowerContent.includes('artificial intelligence') ||
      lowerContent.includes('data science')
    ) {
      return 'ml-ai';
    }

    if (
      lowerContent.includes('mobile') ||
      lowerContent.includes('ios') ||
      lowerContent.includes('android')
    ) {
      return 'mobile';
    }

    if (
      lowerContent.includes('api') &&
      !lowerContent.includes('frontend') &&
      !lowerContent.includes('ui') &&
      !lowerContent.includes('web app')
    ) {
      return 'api';
    }

    if (
      lowerContent.includes('e-commerce') ||
      lowerContent.includes('marketplace') ||
      lowerContent.includes('payment') ||
      lowerContent.includes('shopping')
    ) {
      return 'e-commerce';
    }

    if (
      lowerContent.includes('dashboard') ||
      lowerContent.includes('analytics') ||
      lowerContent.includes('visualization')
    ) {
      return 'dashboard';
    }

    if (
      lowerContent.includes('microservice') ||
      lowerContent.includes('distributed')
    ) {
      return 'microservices';
    }

    return 'web-application';
  }

  /**
   * Extract mentioned technologies from content
   */
  private extractTechnologies(content: string): string[] {
    const techKeywords = [
      'react',
      'vue',
      'angular',
      'node.js',
      'python',
      'java',
      'go',
      'rust',
      'postgresql',
      'mysql',
      'mongodb',
      'redis',
      'elasticsearch',
      'docker',
      'kubernetes',
      'aws',
      'azure',
      'gcp',
      'terraform',
      'jenkins',
      'github actions',
      'gitlab ci',
      'express',
      'fastapi',
      'django',
      'spring',
      'tensorflow',
      'pytorch',
      'scikit-learn',
    ];

    const lowerContent = content.toLowerCase();
    return techKeywords.filter(tech => lowerContent.includes(tech));
  }

  /**
   * Extract functional and non-functional requirements
   */
  private extractRequirements(content: string): {
    functional: string[];
    nonFunctional: string[];
  } {
    const sections = this.extractSections(content);
    const featureSection = sections['feature specification'] || '';

    const functional: string[] = [];
    const nonFunctional: string[] = [];

    // Extract functional requirements
    const functionalMatches = featureSection.match(
      /(?:functional requirements|features)(.*?)(?=non-functional|###|$)/is
    );
    if (functionalMatches) {
      const functionalText = functionalMatches[1];
      functional.push(...this.extractListItems(functionalText));
    }

    // Extract non-functional requirements
    const nonFunctionalMatches = featureSection.match(
      /non-functional requirements(.*?)(?=###|$)/is
    );
    if (nonFunctionalMatches) {
      const nonFunctionalText = nonFunctionalMatches[1];
      nonFunctional.push(...this.extractListItems(nonFunctionalText));
    }

    return { functional, nonFunctional };
  }

  /**
   * Extract constraints from content
   */
  private extractConstraints(content: string): string[] {
    const sections = this.extractSections(content);
    const constraintsSection =
      sections['constraints & considerations'] || sections['constraints'] || '';

    return this.extractListItems(constraintsSection);
  }

  /**
   * Extract stakeholders from content
   */
  private extractStakeholders(content: string): string[] {
    const stakeholderPattern = /stakeholders?[:\s]*(.*?)(?:\n\n|\*\*|$)/is;
    const match = content.match(stakeholderPattern);

    if (match) {
      return this.extractListItems(match[1]);
    }

    return [];
  }

  /**
   * Extract implementation phases from content
   */
  private extractPhases(
    content: string
  ): Array<{ name: string; duration: string; description: string }> {
    const phasePattern = /phase\s+(\d+)[:\s]*(.*?)(?:\(([^)]+)\))?/gi;
    const phases: Array<{
      name: string;
      duration: string;
      description: string;
    }> = [];

    let match;
    while ((match = phasePattern.exec(content)) !== null) {
      phases.push({
        name: `Phase ${match[1]}: ${match[2].trim()}`,
        duration: match[3] || '',
        description: match[2].trim(),
      });
    }

    return phases;
  }

  /**
   * Identify the business domain
   */
  private identifyDomain(content: string): string {
    const lowerContent = content.toLowerCase();

    const domainMap = {
      fintech: [
        'financial',
        'banking',
        'payment',
        'trading',
        'investment',
        'cryptocurrency',
      ],
      healthcare: [
        'health',
        'medical',
        'patient',
        'hospital',
        'clinical',
        'telemedicine',
      ],
      education: [
        'education',
        'learning',
        'student',
        'course',
        'university',
        'academic',
      ],
      'e-commerce': [
        'e-commerce',
        'retail',
        'shopping',
        'marketplace',
        'store',
        'product catalog',
      ],
      entertainment: [
        'media',
        'streaming',
        'gaming',
        'video',
        'music',
        'content',
      ],
      productivity: [
        'task',
        'project management',
        'productivity',
        'workflow',
        'collaboration',
      ],
      social: [
        'social',
        'community',
        'messaging',
        'chat',
        'networking',
        'communication',
      ],
    };

    for (const [domain, keywords] of Object.entries(domainMap)) {
      if (keywords.some(keyword => lowerContent.includes(keyword))) {
        return domain;
      }
    }

    return 'general';
  }

  /**
   * Assess project scale from requirements and constraints
   */
  private assessScale(
    content: string
  ): 'small' | 'medium' | 'large' | 'enterprise' {
    const lowerContent = content.toLowerCase();

    // Enterprise indicators
    if (
      lowerContent.includes('enterprise') ||
      lowerContent.includes('million users') ||
      lowerContent.includes('compliance') ||
      lowerContent.includes('regulatory')
    ) {
      return 'enterprise';
    }

    // Large project indicators
    if (
      lowerContent.includes('microservice') ||
      lowerContent.includes('distributed') ||
      lowerContent.includes('thousand users') ||
      lowerContent.includes('scalab')
    ) {
      return 'large';
    }

    // Medium project indicators
    if (
      lowerContent.includes('database') ||
      lowerContent.includes('authentication') ||
      lowerContent.includes('api') ||
      lowerContent.includes('deployment')
    ) {
      return 'medium';
    }

    return 'small';
  }

  /**
   * Generate agent recommendations based on project analysis
   */
  private async generateAgentRecommendations(
    analysis: any
  ): Promise<AgentRecommendation[]> {
    const recommendations: AgentRecommendation[] = [];
    const projectType = analysis.projectType;
    const scale = analysis.scale;
    const technologies = analysis.technologies;

    // Determine base agent needs
    const agentNeeds = this.determineAgentNeeds(
      projectType,
      scale,
      technologies,
      analysis
    );

    for (const [agentType, count] of Object.entries(agentNeeds)) {
      if (count > 0) {
        const agentInfo =
          this.AGENT_TYPES[agentType as keyof typeof this.AGENT_TYPES];
        if (agentInfo) {
          recommendations.push({
            agentType,
            count: count as number,
            priority: this.calculateAgentPriority(agentType, analysis),
            skills: agentInfo.skills,
            reasoning: this.generateAgentReasoning(agentType, analysis),
            specialization: this.selectSpecialization(agentType, technologies),
          });
        }
      }
    }

    return recommendations.sort((a, b) => b.priority - a.priority);
  }

  /**
   * Determine agent needs based on project characteristics
   */
  private determineAgentNeeds(
    projectType: string,
    scale: string,
    technologies: string[],
    analysis: any
  ): Record<string, number> {
    const needs: Record<string, number> = {};

    // Base needs by project type
    switch (projectType) {
      case 'ml-ai':
        needs['ml-engineer'] =
          scale === 'large' || scale === 'enterprise' ? 2 : 1;
        needs['data-scientist'] = 1;
        needs['backend'] = 1;
        needs['devops'] = 1;
        break;

      case 'mobile':
        needs['frontend'] = 2; // iOS and Android or React Native
        needs['backend'] = 1;
        needs['devops'] = 1;
        break;

      case 'api':
        needs['backend'] = scale === 'large' || scale === 'enterprise' ? 2 : 1;
        needs['devops'] = 1;
        break;

      case 'e-commerce':
        needs['frontend'] = 2;
        needs['backend'] = 2;
        needs['devops'] = 1;
        needs['security'] = 1;
        needs['ui-ux'] = 1;
        break;

      case 'microservices':
        needs['backend'] = 3;
        needs['devops'] = 2;
        needs['architect'] = 1;
        needs['frontend'] = 1;
        break;

      default: // web-application
        needs['frontend'] = scale === 'large' || scale === 'enterprise' ? 2 : 1;
        needs['backend'] = scale === 'large' || scale === 'enterprise' ? 2 : 1;
        needs['fullstack'] = scale === 'small' ? 1 : 0;
        needs['devops'] = 1;
        break;
    }

    // Add QA based on scale
    if (scale === 'large' || scale === 'enterprise') {
      needs['qa-engineer'] = 1;
    }

    // Add security for sensitive domains
    if (
      analysis.domain === 'fintech' ||
      analysis.domain === 'healthcare' ||
      analysis.requirements?.nonFunctional?.some(
        (req: string) =>
          req.toLowerCase().includes('security') ||
          req.toLowerCase().includes('compliance')
      )
    ) {
      needs['security'] = 1;
    }

    // Add architect for complex projects
    if (scale === 'enterprise' || projectType === 'microservices') {
      needs['architect'] = 1;
    }

    return needs;
  }

  /**
   * Calculate agent priority based on project needs
   */
  private calculateAgentPriority(agentType: string, analysis: any): number {
    const basePriority: Record<string, number> = {
      architect: 10,
      backend: 9,
      frontend: 8,
      fullstack: 7,
      'ml-engineer': 9,
      'data-scientist': 8,
      devops: 6,
      security: 5,
      'qa-engineer': 4,
      'ui-ux': 3,
    };

    let priority = basePriority[agentType] || 5;

    // Adjust based on project characteristics
    if (
      analysis.projectType === 'ml-ai' &&
      (agentType === 'ml-engineer' || agentType === 'data-scientist')
    ) {
      priority += 2;
    }

    if (analysis.domain === 'fintech' && agentType === 'security') {
      priority += 3;
    }

    if (analysis.scale === 'enterprise' && agentType === 'architect') {
      priority += 2;
    }

    return priority;
  }

  /**
   * Generate reasoning for agent recommendation
   */
  private generateAgentReasoning(agentType: string, analysis: any): string {
    const reasoningMap: Record<string, string> = {
      backend:
        'Required for API development, business logic, and data management',
      frontend:
        'Essential for user interface development and client-side functionality',
      fullstack:
        'Versatile developers who can handle both frontend and backend tasks',
      devops:
        'Needed for deployment, infrastructure management, and CI/CD pipelines',
      'ml-engineer':
        'Specialized in implementing ML pipelines and model deployment',
      'data-scientist':
        'Required for data analysis, model development, and statistical insights',
      security:
        'Critical for ensuring application security and compliance requirements',
      'qa-engineer':
        'Ensures quality through testing, automation, and bug detection',
      'ui-ux': 'Focuses on user experience design and interface optimization',
      architect: 'Provides technical leadership and system architecture design',
    };

    let baseReasoning =
      reasoningMap[agentType] ||
      'Contributes specialized skills to the project';

    // Add project-specific context
    if (analysis.projectType === 'e-commerce' && agentType === 'security') {
      baseReasoning +=
        '. Payment processing requires enhanced security measures';
    }

    if (analysis.scale === 'enterprise' && agentType === 'architect') {
      baseReasoning +=
        '. Enterprise-scale projects require careful architectural planning';
    }

    return baseReasoning;
  }

  /**
   * Select appropriate specialization for agent
   */
  private selectSpecialization(
    agentType: string,
    technologies: string[]
  ): string | undefined {
    const agentInfo =
      this.AGENT_TYPES[agentType as keyof typeof this.AGENT_TYPES];
    if (!agentInfo) return undefined;

    // Find matching specializations
    const matchingSpecs = agentInfo.specializations.filter(spec =>
      technologies.some(tech => tech.toLowerCase().includes(spec.toLowerCase()))
    );

    return matchingSpecs.length > 0
      ? matchingSpecs[0]
      : agentInfo.specializations[0];
  }

  /**
   * Generate task breakdown from project analysis
   */
  private async generateTaskBreakdown(analysis: any): Promise<TaskGroup[]> {
    const taskGroups: TaskGroup[] = [];
    let taskIdCounter = 1;

    // Generate core task groups based on project type
    const coreGroups = this.generateCoreTaskGroups(analysis, taskIdCounter);
    taskGroups.push(...coreGroups);
    taskIdCounter += coreGroups.reduce(
      (sum, group) => sum + group.tasks.length,
      0
    );

    // Add specialized task groups
    const specializedGroups = this.generateSpecializedTaskGroups(
      analysis,
      taskIdCounter
    );
    taskGroups.push(...specializedGroups);

    return taskGroups;
  }

  /**
   * Generate core task groups common to most projects
   */
  private generateCoreTaskGroups(analysis: any, startId: number): TaskGroup[] {
    const groups: TaskGroup[] = [];
    let currentId = startId;

    // Project Setup and Planning
    groups.push({
      id: 'setup',
      title: 'Project Setup and Planning',
      description:
        'Initialize project infrastructure and development environment',
      phase: 'foundation',
      priority: 10,
      estimatedHours: 16,
      dependencies: [],
      tasks: [
        {
          id: `task-${currentId++}`,
          title: 'Set up development environment',
          description:
            'Configure development tools, version control, and project structure',
          acceptance: [
            'Repository created',
            'Development environment documented',
            'Team has access',
          ],
          dependencies: [],
          estimatedHours: 4,
          complexity: 'low',
          category: 'planning',
          agentTypes: ['devops', 'architect'],
        },
        {
          id: `task-${currentId++}`,
          title: 'Define project architecture',
          description:
            'Create system architecture diagrams and technical specifications',
          acceptance: [
            'Architecture document created',
            'Technology stack finalized',
            'Team review completed',
          ],
          dependencies: [],
          estimatedHours: 8,
          complexity: 'medium',
          category: 'planning',
          agentTypes: ['architect', 'backend'],
        },
        {
          id: `task-${currentId++}`,
          title: 'Set up CI/CD pipeline',
          description:
            'Implement continuous integration and deployment workflows',
          acceptance: [
            'CI/CD pipeline functional',
            'Automated testing configured',
            'Deployment process documented',
          ],
          dependencies: [`task-${currentId - 2}`],
          estimatedHours: 4,
          complexity: 'medium',
          category: 'development',
          agentTypes: ['devops'],
        },
      ],
    });

    // Backend Development (if applicable)
    if (analysis.projectType !== 'frontend-only') {
      groups.push({
        id: 'backend',
        title: 'Backend Development',
        description: 'Develop server-side logic, APIs, and data management',
        phase: 'core-development',
        priority: 9,
        estimatedHours: this.estimateBackendHours(analysis),
        dependencies: ['setup'],
        tasks: this.generateBackendTasks(analysis, currentId),
      });

      currentId += groups[groups.length - 1].tasks.length;
    }

    // Frontend Development (if applicable)
    if (analysis.projectType !== 'api') {
      groups.push({
        id: 'frontend',
        title: 'Frontend Development',
        description: 'Develop user interface and client-side functionality',
        phase: 'core-development',
        priority: 8,
        estimatedHours: this.estimateFrontendHours(analysis),
        dependencies:
          analysis.projectType !== 'frontend-only' ? ['backend'] : ['setup'],
        tasks: this.generateFrontendTasks(analysis, currentId),
      });

      currentId += groups[groups.length - 1].tasks.length;
    }

    return groups;
  }

  /**
   * Generate specialized task groups based on project characteristics
   */
  private generateSpecializedTaskGroups(
    analysis: any,
    startId: number
  ): TaskGroup[] {
    const groups: TaskGroup[] = [];
    let currentId = startId;

    // ML/AI specific tasks
    if (analysis.projectType === 'ml-ai') {
      groups.push({
        id: 'ml-pipeline',
        title: 'Machine Learning Pipeline',
        description: 'Develop data processing and ML model infrastructure',
        phase: 'specialized-development',
        priority: 9,
        estimatedHours: 40,
        dependencies: ['setup'],
        tasks: [
          {
            id: `task-${currentId++}`,
            title: 'Data preprocessing pipeline',
            description:
              'Build data ingestion, cleaning, and preprocessing workflows',
            acceptance: [
              'Data pipeline functional',
              'Data quality checks implemented',
              'Performance benchmarks met',
            ],
            dependencies: [],
            estimatedHours: 16,
            complexity: 'high',
            category: 'development',
            agentTypes: ['ml-engineer', 'data-scientist'],
          },
          {
            id: `task-${currentId++}`,
            title: 'Model training infrastructure',
            description:
              'Set up model training, validation, and hyperparameter tuning',
            acceptance: [
              'Training pipeline functional',
              'Model validation implemented',
              'Hyperparameter optimization working',
            ],
            dependencies: [`task-${currentId - 1}`],
            estimatedHours: 24,
            complexity: 'high',
            category: 'development',
            agentTypes: ['ml-engineer', 'data-scientist'],
          },
        ],
      });
    }

    // Security tasks for sensitive domains
    if (
      analysis.domain === 'fintech' ||
      analysis.domain === 'healthcare' ||
      analysis.requirements?.nonFunctional?.some(
        (req: string) =>
          req.toLowerCase().includes('security') ||
          req.toLowerCase().includes('compliance')
      )
    ) {
      groups.push({
        id: 'security',
        title: 'Security Implementation',
        description: 'Implement security measures and compliance requirements',
        phase: 'security-hardening',
        priority: 7,
        estimatedHours: 24,
        dependencies: ['backend', 'frontend'],
        tasks: [
          {
            id: `task-${currentId++}`,
            title: 'Security audit and penetration testing',
            description:
              'Conduct comprehensive security assessment and vulnerability testing',
            acceptance: [
              'Security audit completed',
              'Vulnerabilities identified and fixed',
              'Penetration test passed',
            ],
            dependencies: [],
            estimatedHours: 12,
            complexity: 'high',
            category: 'testing',
            agentTypes: ['security'],
          },
          {
            id: `task-${currentId++}`,
            title: 'Compliance implementation',
            description:
              'Implement required compliance measures and documentation',
            acceptance: [
              'Compliance requirements met',
              'Documentation complete',
              'Audit trail implemented',
            ],
            dependencies: [`task-${currentId - 1}`],
            estimatedHours: 12,
            complexity: 'medium',
            category: 'development',
            agentTypes: ['security', 'backend'],
          },
        ],
      });
    }

    // Testing and QA
    groups.push({
      id: 'testing',
      title: 'Testing and Quality Assurance',
      description: 'Comprehensive testing and quality assurance processes',
      phase: 'testing-validation',
      priority: 6,
      estimatedHours: this.estimateTestingHours(analysis),
      dependencies: ['backend', 'frontend'],
      tasks: this.generateTestingTasks(analysis, currentId),
    });

    return groups;
  }

  /**
   * Generate backend-specific tasks
   */
  private generateBackendTasks(
    analysis: any,
    startId: number
  ): ExecutionTask[] {
    const tasks: ExecutionTask[] = [];
    let currentId = startId;

    tasks.push(
      {
        id: `task-${currentId++}`,
        title: 'Database design and setup',
        description: 'Design database schema and set up data persistence layer',
        acceptance: [
          'Database schema designed',
          'Migrations created',
          'Seed data populated',
        ],
        dependencies: [],
        estimatedHours: 8,
        complexity: 'medium',
        category: 'development',
        agentTypes: ['backend'],
      },
      {
        id: `task-${currentId++}`,
        title: 'Core API development',
        description: 'Develop REST API endpoints and business logic',
        acceptance: [
          'API endpoints implemented',
          'Business logic complete',
          'API documentation created',
        ],
        dependencies: [`task-${currentId - 1}`],
        estimatedHours: 20,
        complexity: 'high',
        category: 'development',
        agentTypes: ['backend'],
      }
    );

    if (
      analysis.requirements?.functional?.some(
        (req: string) =>
          req.toLowerCase().includes('auth') ||
          req.toLowerCase().includes('login')
      )
    ) {
      tasks.push({
        id: `task-${currentId++}`,
        title: 'Authentication and authorization',
        description:
          'Implement user authentication and role-based access control',
        acceptance: [
          'Auth system functional',
          'Role-based access implemented',
          'Security measures in place',
        ],
        dependencies: [`task-${currentId - 1}`],
        estimatedHours: 12,
        complexity: 'high',
        category: 'development',
        agentTypes: ['backend', 'security'],
      });
    }

    return tasks;
  }

  /**
   * Generate frontend-specific tasks
   */
  private generateFrontendTasks(
    analysis: any,
    startId: number
  ): ExecutionTask[] {
    const tasks: ExecutionTask[] = [];
    let currentId = startId;

    tasks.push(
      {
        id: `task-${currentId++}`,
        title: 'UI component development',
        description: 'Create reusable UI components and design system',
        acceptance: [
          'Component library created',
          'Design system implemented',
          'Components documented',
        ],
        dependencies: [],
        estimatedHours: 16,
        complexity: 'medium',
        category: 'development',
        agentTypes: ['frontend', 'ui-ux'],
      },
      {
        id: `task-${currentId++}`,
        title: 'Application state management',
        description: 'Implement state management and data flow architecture',
        acceptance: [
          'State management implemented',
          'Data flow documented',
          'Performance optimized',
        ],
        dependencies: [`task-${currentId - 1}`],
        estimatedHours: 12,
        complexity: 'medium',
        category: 'development',
        agentTypes: ['frontend'],
      }
    );

    if (
      analysis.requirements?.nonFunctional?.some(
        (req: string) =>
          req.toLowerCase().includes('mobile') ||
          req.toLowerCase().includes('responsive')
      )
    ) {
      tasks.push({
        id: `task-${currentId++}`,
        title: 'Responsive design implementation',
        description:
          'Ensure application works across different screen sizes and devices',
        acceptance: [
          'Mobile-responsive design',
          'Cross-browser compatibility',
          'Performance on mobile devices',
        ],
        dependencies: [`task-${currentId - 2}`],
        estimatedHours: 8,
        complexity: 'medium',
        category: 'development',
        agentTypes: ['frontend', 'ui-ux'],
      });
    }

    return tasks;
  }

  /**
   * Generate testing tasks
   */
  private generateTestingTasks(
    analysis: any,
    startId: number
  ): ExecutionTask[] {
    const tasks: ExecutionTask[] = [];
    let currentId = startId;

    tasks.push(
      {
        id: `task-${currentId++}`,
        title: 'Unit testing implementation',
        description: 'Create comprehensive unit tests for all components',
        acceptance: [
          'Unit test coverage > 80%',
          'All critical functions tested',
          'Tests automated in CI',
        ],
        dependencies: [],
        estimatedHours: 16,
        complexity: 'medium',
        category: 'testing',
        agentTypes: ['qa-engineer', 'backend', 'frontend'],
      },
      {
        id: `task-${currentId++}`,
        title: 'Integration testing',
        description: 'Test system integration points and API endpoints',
        acceptance: [
          'Integration tests created',
          'API endpoints tested',
          'Data flow validated',
        ],
        dependencies: [`task-${currentId - 1}`],
        estimatedHours: 12,
        complexity: 'medium',
        category: 'testing',
        agentTypes: ['qa-engineer'],
      }
    );

    if (
      analysis.requirements?.nonFunctional?.some(
        (req: string) =>
          req.toLowerCase().includes('performance') ||
          req.toLowerCase().includes('scalab')
      )
    ) {
      tasks.push({
        id: `task-${currentId++}`,
        title: 'Performance testing',
        description: 'Conduct load testing and performance optimization',
        acceptance: [
          'Performance benchmarks met',
          'Load testing completed',
          'Bottlenecks identified and resolved',
        ],
        dependencies: [`task-${currentId - 1}`],
        estimatedHours: 8,
        complexity: 'high',
        category: 'testing',
        agentTypes: ['qa-engineer', 'devops'],
      });
    }

    return tasks;
  }

  /**
   * Estimate hours for different development areas
   */
  private estimateBackendHours(analysis: any): number {
    let baseHours = 40; // Base backend development

    if (analysis.scale === 'large') baseHours += 20;
    if (analysis.scale === 'enterprise') baseHours += 40;
    if (analysis.projectType === 'e-commerce') baseHours += 20;
    if (analysis.projectType === 'microservices') baseHours += 30;

    return baseHours;
  }

  private estimateFrontendHours(analysis: any): number {
    let baseHours = 32; // Base frontend development

    if (analysis.scale === 'large') baseHours += 16;
    if (analysis.scale === 'enterprise') baseHours += 32;
    if (analysis.projectType === 'e-commerce') baseHours += 16;
    if (
      analysis.requirements?.nonFunctional?.some(
        (req: string) =>
          req.toLowerCase().includes('mobile') ||
          req.toLowerCase().includes('responsive')
      )
    ) {
      baseHours += 8;
    }

    return baseHours;
  }

  private estimateTestingHours(analysis: any): number {
    let baseHours = 20; // Base testing

    if (analysis.scale === 'large') baseHours += 10;
    if (analysis.scale === 'enterprise') baseHours += 20;
    if (analysis.domain === 'fintech' || analysis.domain === 'healthcare')
      baseHours += 15;

    return baseHours;
  }

  /**
   * Assess project risks
   */
  private async assessRisks(analysis: any): Promise<RiskAssessment> {
    const risks: Risk[] = [];
    let riskIdCounter = 1;

    // Technical complexity risks
    if (analysis.projectType === 'ml-ai') {
      risks.push({
        id: `risk-${riskIdCounter++}`,
        category: 'technical',
        severity: 'high',
        probability: 'medium',
        description:
          'Machine learning model performance may not meet accuracy requirements',
        impact:
          'Could require significant rework of ML pipeline and model architecture',
        mitigation:
          'Implement comprehensive model validation, use proven algorithms, and plan for iterative improvements',
      });
    }

    if (analysis.projectType === 'microservices') {
      risks.push({
        id: `risk-${riskIdCounter++}`,
        category: 'technical',
        severity: 'medium',
        probability: 'medium',
        description:
          'Distributed system complexity may cause integration challenges',
        impact:
          'Increased development time and potential service reliability issues',
        mitigation:
          'Use proven microservices patterns, implement comprehensive monitoring, and plan for gradual migration',
      });
    }

    // Scale-related risks
    if (analysis.scale === 'enterprise') {
      risks.push({
        id: `risk-${riskIdCounter++}`,
        category: 'technical',
        severity: 'high',
        probability: 'medium',
        description:
          'Performance and scalability requirements may be difficult to achieve',
        impact:
          'System may not handle expected load, requiring architectural changes',
        mitigation:
          'Conduct early performance testing, use proven scalability patterns, and plan for horizontal scaling',
      });
    }

    // Domain-specific risks
    if (analysis.domain === 'fintech') {
      risks.push({
        id: `risk-${riskIdCounter++}`,
        category: 'external',
        severity: 'critical',
        probability: 'medium',
        description:
          'Regulatory compliance requirements may change during development',
        impact:
          'Could require significant changes to architecture and implementation',
        mitigation:
          'Engage compliance experts early, build flexible architecture, and maintain regulatory tracking',
      });
    }

    // Resource and timeline risks
    const phases = analysis.phases || [];
    if (phases.length > 4) {
      risks.push({
        id: `risk-${riskIdCounter++}`,
        category: 'timeline',
        severity: 'medium',
        probability: 'high',
        description: 'Complex multi-phase development may experience delays',
        impact:
          'Project delivery may be delayed, affecting business objectives',
        mitigation:
          'Build buffer time into estimates, use agile methodology, and prioritize critical features',
      });
    }

    // Technology risks
    const cuttingEdgeTech = analysis.technologies.some((tech: string) =>
      ['rust', 'webassembly', 'quantum'].includes(tech.toLowerCase())
    );
    if (cuttingEdgeTech) {
      risks.push({
        id: `risk-${riskIdCounter++}`,
        category: 'technical',
        severity: 'medium',
        probability: 'medium',
        description:
          'Cutting-edge technologies may have limited community support and resources',
        impact:
          'Development may be slower due to lack of documentation and expertise',
        mitigation:
          'Ensure team training, have fallback technology options, and allocate extra time for learning',
      });
    }

    const overallRisk = this.calculateOverallRisk(risks);
    const mitigationStrategies = this.generateMitigationStrategies(
      analysis,
      risks
    );

    return {
      overallRisk,
      risks,
      mitigationStrategies,
    };
  }

  /**
   * Calculate overall risk level
   */
  private calculateOverallRisk(
    risks: Risk[]
  ): 'low' | 'medium' | 'high' | 'critical' {
    const criticalCount = risks.filter(r => r.severity === 'critical').length;
    const highCount = risks.filter(r => r.severity === 'high').length;
    const mediumCount = risks.filter(r => r.severity === 'medium').length;

    if (criticalCount > 0) return 'critical';
    if (highCount > 2) return 'high';
    if (highCount > 0 || mediumCount > 3) return 'medium';
    return 'low';
  }

  /**
   * Generate mitigation strategies
   */
  private generateMitigationStrategies(analysis: any, risks: Risk[]): string[] {
    const strategies = new Set<string>();

    // Add risk-specific mitigations
    risks.forEach(risk => strategies.add(risk.mitigation));

    // Add general strategies based on analysis
    if (
      analysis.scale === 'enterprise' ||
      analysis.projectType === 'microservices'
    ) {
      strategies.add(
        'Implement comprehensive monitoring and observability from day one'
      );
      strategies.add('Use infrastructure as code for consistent deployments');
    }

    if (analysis.projectType === 'ml-ai') {
      strategies.add(
        'Establish model validation pipeline and data quality checks'
      );
      strategies.add('Plan for model versioning and rollback capabilities');
    }

    if (analysis.domain === 'fintech' || analysis.domain === 'healthcare') {
      strategies.add(
        'Engage security and compliance experts throughout the project'
      );
      strategies.add(
        'Implement comprehensive audit logging and data protection measures'
      );
    }

    strategies.add('Use agile methodology with regular stakeholder feedback');
    strategies.add('Implement continuous integration and automated testing');
    strategies.add('Maintain clear documentation and knowledge sharing');

    return Array.from(strategies).slice(0, 10); // Top 10 strategies
  }

  /**
   * Plan implementation phases with dependencies
   */
  private async planImplementationPhases(
    analysis: any,
    taskGroups: TaskGroup[]
  ): Promise<ImplementationPhase[]> {
    const phases: ImplementationPhase[] = [];

    // Foundation Phase
    phases.push({
      id: 'foundation',
      name: 'Foundation and Setup',
      description:
        'Project initialization, architecture design, and development environment setup',
      taskGroups: taskGroups
        .filter(tg => tg.phase === 'foundation')
        .map(tg => tg.id),
      dependencies: [],
      deliverables: [
        'Development environment',
        'Project architecture',
        'CI/CD pipeline',
      ],
      estimatedDuration: 1,
      criticalPath: true,
    });

    // Core Development Phase
    phases.push({
      id: 'core-development',
      name: 'Core Development',
      description: 'Implementation of primary features and functionality',
      taskGroups: taskGroups
        .filter(tg => tg.phase === 'core-development')
        .map(tg => tg.id),
      dependencies: ['foundation'],
      deliverables: ['Core functionality', 'API endpoints', 'User interface'],
      estimatedDuration: this.estimateCoreDevelopmentDuration(analysis),
      criticalPath: true,
    });

    // Specialized Development Phase
    const specializedGroups = taskGroups.filter(
      tg => tg.phase === 'specialized-development'
    );
    if (specializedGroups.length > 0) {
      phases.push({
        id: 'specialized-development',
        name: 'Specialized Development',
        description:
          'Implementation of specialized features and domain-specific functionality',
        taskGroups: specializedGroups.map(tg => tg.id),
        dependencies: ['foundation'],
        deliverables: ['Specialized features', 'Domain-specific functionality'],
        estimatedDuration: 2,
        criticalPath: false,
      });
    }

    // Security and Compliance Phase
    const securityGroups = taskGroups.filter(
      tg => tg.phase === 'security-hardening'
    );
    if (securityGroups.length > 0) {
      phases.push({
        id: 'security-hardening',
        name: 'Security and Compliance',
        description:
          'Security implementation, compliance validation, and hardening',
        taskGroups: securityGroups.map(tg => tg.id),
        dependencies: ['core-development'],
        deliverables: [
          'Security measures',
          'Compliance documentation',
          'Security audit',
        ],
        estimatedDuration: 1,
        criticalPath:
          analysis.domain === 'fintech' || analysis.domain === 'healthcare',
      });
    }

    // Testing and Validation Phase
    phases.push({
      id: 'testing-validation',
      name: 'Testing and Validation',
      description:
        'Comprehensive testing, quality assurance, and performance validation',
      taskGroups: taskGroups
        .filter(tg => tg.phase === 'testing-validation')
        .map(tg => tg.id),
      dependencies: ['core-development'],
      deliverables: [
        'Test suite',
        'Quality assurance',
        'Performance validation',
      ],
      estimatedDuration: 2,
      criticalPath: true,
    });

    // Deployment and Launch Phase
    phases.push({
      id: 'deployment-launch',
      name: 'Deployment and Launch',
      description:
        'Production deployment, monitoring setup, and go-live activities',
      taskGroups: [],
      dependencies: ['testing-validation'],
      deliverables: [
        'Production deployment',
        'Monitoring setup',
        'Launch documentation',
      ],
      estimatedDuration: 1,
      criticalPath: true,
    });

    return phases;
  }

  /**
   * Estimate core development duration
   */
  private estimateCoreDevelopmentDuration(analysis: any): number {
    let baseDuration = 4; // 4 weeks base

    if (analysis.scale === 'large') baseDuration += 2;
    if (analysis.scale === 'enterprise') baseDuration += 4;
    if (analysis.projectType === 'e-commerce') baseDuration += 2;
    if (analysis.projectType === 'microservices') baseDuration += 3;
    if (analysis.projectType === 'ml-ai') baseDuration += 3;

    return baseDuration;
  }

  /**
   * Recommend technologies based on project analysis
   */
  private async recommendTechnologies(
    analysis: any
  ): Promise<TechnologyRecommendation[]> {
    const recommendations: TechnologyRecommendation[] = [];

    // Frontend recommendations
    if (analysis.projectType !== 'api') {
      const frontendTech = this.selectTechnology('frontend', analysis);
      recommendations.push(...frontendTech);
    }

    // Backend recommendations
    if (analysis.projectType !== 'frontend-only') {
      const backendTech = this.selectTechnology('backend', analysis);
      recommendations.push(...backendTech);
    }

    // Database recommendations
    const dbTech = this.selectTechnology('database', analysis);
    recommendations.push(...dbTech);

    // Deployment recommendations
    const deploymentTech = this.selectTechnology('deployment', analysis);
    recommendations.push(...deploymentTech);

    // Add specialized technology recommendations
    if (analysis.projectType === 'ml-ai') {
      recommendations.push({
        category: 'backend',
        technology: 'TensorFlow',
        version: '2.x',
        reasoning:
          'Industry-leading ML framework with comprehensive ecosystem and strong community support',
        alternatives: ['PyTorch', 'scikit-learn', 'Keras'],
        confidence: 0.9,
      });
    }

    if (analysis.scale === 'large' || analysis.scale === 'enterprise') {
      recommendations.push({
        category: 'monitoring',
        technology: 'Prometheus + Grafana',
        reasoning:
          'Robust monitoring and visualization stack suitable for large-scale applications',
        alternatives: ['DataDog', 'New Relic', 'ELK Stack'],
        confidence: 0.85,
      });
    }

    return recommendations;
  }

  /**
   * Select appropriate technology for a category
   */
  private selectTechnology(
    category: string,
    analysis: any
  ): TechnologyRecommendation[] {
    const categoryTech =
      this.TECHNOLOGY_RECOMMENDATIONS[
        category as keyof typeof this.TECHNOLOGY_RECOMMENDATIONS
      ];
    if (!categoryTech) return [];

    const recommendations: TechnologyRecommendation[] = [];

    // Select top 2-3 recommendations per category
    const topTech = categoryTech.slice(0, analysis.scale === 'small' ? 1 : 2);

    topTech.forEach(tech => {
      let adjustedConfidence = tech.confidence;
      let reasoning = this.generateTechnologyReasoning(tech.tech, analysis);

      // Adjust confidence based on project characteristics
      if (analysis.technologies.includes(tech.tech.toLowerCase())) {
        adjustedConfidence = Math.min(1.0, adjustedConfidence + 0.1); // Boost if already mentioned
        reasoning += '. Already specified in project requirements';
      }

      recommendations.push({
        category: category as any,
        technology: tech.tech,
        reasoning,
        alternatives: tech.alternatives,
        confidence: adjustedConfidence,
      });
    });

    return recommendations;
  }

  /**
   * Generate reasoning for technology choice
   */
  private generateTechnologyReasoning(
    technology: string,
    analysis: any
  ): string {
    const reasoningMap: Record<string, string> = {
      React:
        'Popular, well-supported framework with large ecosystem and strong TypeScript support',
      'Node.js':
        'JavaScript runtime enabling full-stack development with single language',
      TypeScript:
        'Adds type safety to JavaScript, improving code quality and developer experience',
      PostgreSQL:
        'Robust relational database with excellent performance and ACID compliance',
      Docker:
        'Containerization enables consistent deployments across environments',
      AWS: 'Comprehensive cloud platform with extensive services and global infrastructure',
      'Express.js':
        'Minimal and flexible Node.js web framework with large community',
      MongoDB:
        'Document database suitable for flexible data schemas and rapid development',
    };

    let baseReasoning =
      reasoningMap[technology] ||
      `Industry-standard technology suitable for ${analysis.projectType} projects`;

    // Add project-specific context
    if (analysis.scale === 'enterprise' && technology === 'PostgreSQL') {
      baseReasoning += '. Enterprise-grade reliability and performance';
    }

    if (analysis.projectType === 'e-commerce' && technology === 'React') {
      baseReasoning +=
        '. Excellent for complex, interactive user interfaces required in e-commerce';
    }

    return baseReasoning;
  }

  /**
   * Assess overall project complexity
   */
  private assessComplexity(
    analysis: any
  ): 'low' | 'medium' | 'high' | 'very-high' {
    let complexityScore = 0;

    // Project type complexity
    const typeComplexity = {
      api: 1,
      'web-application': 2,
      mobile: 3,
      'e-commerce': 4,
      microservices: 5,
      'ml-ai': 6,
    };
    complexityScore +=
      typeComplexity[analysis.projectType as keyof typeof typeComplexity] || 2;

    // Scale complexity
    const scaleComplexity = {
      small: 1,
      medium: 2,
      large: 4,
      enterprise: 6,
    };
    complexityScore += scaleComplexity[analysis.scale];

    // Domain complexity
    if (analysis.domain === 'fintech' || analysis.domain === 'healthcare') {
      complexityScore += 2; // Regulatory complexity
    }

    // Technology complexity
    if (
      analysis.technologies.includes('microservice') ||
      analysis.technologies.includes('kubernetes')
    ) {
      complexityScore += 2;
    }

    // Requirements complexity
    const functionalCount = analysis.requirements?.functional?.length || 0;
    const nonFunctionalCount =
      analysis.requirements?.nonFunctional?.length || 0;
    complexityScore += Math.floor((functionalCount + nonFunctionalCount) / 5);

    // Map score to complexity level
    if (complexityScore <= 3) return 'low';
    if (complexityScore <= 6) return 'medium';
    if (complexityScore <= 10) return 'high';
    return 'very-high';
  }

  /**
   * Estimate project duration
   */
  private estimateDuration(
    analysis: any,
    complexity: string
  ): { minimum: number; maximum: number; unit: 'hours' | 'days' | 'weeks' } {
    const baseDuration = {
      low: { min: 2, max: 4, unit: 'weeks' as const },
      medium: { min: 4, max: 8, unit: 'weeks' as const },
      high: { min: 8, max: 16, unit: 'weeks' as const },
      'very-high': { min: 16, max: 32, unit: 'weeks' as const },
    };

    const base = baseDuration[complexity];

    // Adjust for specific project characteristics
    let multiplier = 1.0;

    if (analysis.domain === 'fintech' || analysis.domain === 'healthcare') {
      multiplier += 0.3; // Compliance overhead
    }

    if (analysis.projectType === 'ml-ai') {
      multiplier += 0.4; // ML uncertainty
    }

    if (analysis.scale === 'enterprise') {
      multiplier += 0.5; // Enterprise complexity
    }

    return {
      minimum: Math.ceil(base.min * multiplier),
      maximum: Math.ceil(base.max * multiplier),
      unit: base.unit,
    };
  }

  /**
   * Extract list items from text content
   */
  private extractListItems(content: string): string[] {
    const items: string[] = [];

    // Extract bullet points
    const bulletMatches = content.match(/^[\s]*[-*+]\s(.+)$/gm);
    if (bulletMatches) {
      items.push(
        ...bulletMatches.map(match => match.replace(/^[\s]*[-*+]\s/, '').trim())
      );
    }

    // Extract numbered lists
    const numberedMatches = content.match(/^[\s]*\d+\.\s(.+)$/gm);
    if (numberedMatches) {
      items.push(
        ...numberedMatches.map(match =>
          match.replace(/^[\s]*\d+\.\s/, '').trim()
        )
      );
    }

    // Extract comma-separated items if no lists found
    if (items.length === 0) {
      const commaSeparated = content
        .split(',')
        .map(item => item.trim())
        .filter(item => item.length > 0);
      items.push(...commaSeparated);
    }

    return items.filter(item => item.length > 2); // Filter out very short items
  }
}
