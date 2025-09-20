import {
  PRPValidationResult,
  SectionValidation,
  AntiPattern
} from '../types/index.js';

/**
 * PRPValidator provides comprehensive validation of Product Requirements Prompts
 * based on Cole Medin's context engineering methodology and best practices.
 */
export class PRPValidator {
  private readonly CORE_SECTIONS = [
    'project overview',
    'feature specification',
    'technical architecture',
    'user experience',
    'implementation approach',
    'success metrics',
    'constraints & considerations'
  ];

  private readonly SECTION_WEIGHTS = {
    'project overview': 20,
    'feature specification': 25,
    'technical architecture': 20,
    'user experience': 15,
    'implementation approach': 10,
    'success metrics': 5,
    'constraints & considerations': 5
  };

  private readonly ANTI_PATTERNS = [
    {
      id: 'vague-requirements',
      name: 'Vague Requirements',
      description: 'Requirements lack specificity and measurable criteria',
      severity: 'high' as const,
      patterns: [
        /should be (user-friendly|performant|scalable|maintainable|good|better|best|amazing|revolutionary)/gi,
        /handle (things|stuff|data|requests) (efficiently|well|properly)/gi,
        /(fast|quick|responsive) (enough|system|solution)/gi
      ]
    },
    {
      id: 'buzzword-overuse',
      name: 'Buzzword Overuse',
      description: 'Overuse of trendy technical terms without context',
      severity: 'medium' as const,
      patterns: [
        /(cloud-native|AI-powered|machine learning|blockchain|microservices|serverless|containerized).*(cloud-native|AI-powered|machine learning|blockchain|microservices|serverless|containerized)/gi,
        /latest and greatest technologies/gi,
        /revolutionary|game-changing|disruptive/gi
      ]
    },
    {
      id: 'vague-language',
      name: 'Vague Language',
      description: 'Use of imprecise language that lacks clarity',
      severity: 'medium' as const,
      patterns: [
        /\b(somehow|maybe|probably|perhaps|might|could|should|would)\b/gi,
        /\b(various|several|multiple|many|lots of|plenty of)\b(?!\s+(requirements|features|users|tests))/gi,
        /\b(appropriate|suitable|proper|adequate|sufficient)\b(?!\s+for)/gi
      ]
    },
    {
      id: 'missing-acceptance-criteria',
      name: 'Missing Acceptance Criteria',
      description: 'Features lack clear acceptance criteria or success conditions',
      severity: 'high' as const,
      patterns: [
        /build|create|implement|develop.*(?!.*(?:acceptance criteria|success criteria|when|given|then|should))/gi
      ]
    },
    {
      id: 'unjustified-technology',
      name: 'Unjustified Technology Choices',
      description: 'Technology selections without reasoning or justification',
      severity: 'medium' as const,
      patterns: [
        /(React|Angular|Vue|Node\.js|Python|Java|Go|Rust|PostgreSQL|MongoDB|Redis|Docker|Kubernetes).*(?!.*(?:because|since|due to|chosen for|selected for|reasons|justification))/gi
      ]
    },
    {
      id: 'no-constraints',
      name: 'Missing Constraints',
      description: 'Lack of identified technical, business, or resource constraints',
      severity: 'medium' as const,
      patterns: []
    }
  ];

  /**
   * Validates a PRP and returns comprehensive validation results
   */
  async validatePRP(prpContent: string): Promise<PRPValidationResult> {
    if (!prpContent || prpContent.trim().length === 0) {
      return this.createEmptyValidationResult();
    }

    const sections = await this.extractSections(prpContent);
    const sectionValidations = await this.validateSections(sections);
    const antiPatterns = await this.detectAntiPatterns(prpContent, sections);

    const totalScore = sectionValidations.reduce((sum, sv) => sum + sv.score, 0);
    const maxScore = sectionValidations.reduce((sum, sv) => sum + sv.maxScore, 0);

    const isValid = totalScore >= (maxScore * 0.7); // 70% threshold for validity
    const missingElements = this.identifyMissingElements(sections);
    const recommendations = this.generateRecommendations(sectionValidations, antiPatterns);

    return {
      isValid,
      score: Math.round(totalScore),
      maxScore: Math.round(maxScore),
      sections: sectionValidations,
      recommendations,
      missingElements,
      antiPatterns
    };
  }

  /**
   * Extract sections from PRP content (supports markdown and JSON)
   */
  private async extractSections(content: string): Promise<Record<string, string>> {
    const sections: Record<string, string> = {};

    try {
      // Try to parse as JSON first
      const parsed = JSON.parse(content);
      if (parsed.sections && Array.isArray(parsed.sections)) {
        parsed.sections.forEach((section: any) => {
          if (section.title && section.content) {
            sections[section.title.toLowerCase()] = section.content;
          }
        });
        return sections;
      }
    } catch {
      // Not JSON, continue with markdown parsing
    }

    // Parse markdown sections
    const lines = content.split('\n');
    let currentSection = '';
    let currentContent: string[] = [];

    for (const line of lines) {
      const trimmedLine = line.trim();

      // Check for section headers (## or ###)
      if (trimmedLine.startsWith('## ') || trimmedLine.startsWith('### ')) {
        // Save previous section
        if (currentSection && currentContent.length > 0) {
          sections[currentSection.toLowerCase()] = currentContent.join('\n').trim();
        }

        // Start new section
        currentSection = trimmedLine.replace(/^#+\s*/, '').replace(/[*:]/g, '').trim();
        currentContent = [];
      } else if (currentSection) {
        currentContent.push(line);
      }
    }

    // Save final section
    if (currentSection && currentContent.length > 0) {
      sections[currentSection.toLowerCase()] = currentContent.join('\n').trim();
    }

    return sections;
  }

  /**
   * Validate individual sections against Cole's standards
   */
  private async validateSections(sections: Record<string, string>): Promise<SectionValidation[]> {
    const validations: SectionValidation[] = [];

    for (const coreSection of this.CORE_SECTIONS) {
      const sectionContent = sections[coreSection] || '';
      const isPresent = sectionContent.length > 0;
      const validation = await this.validateSection(coreSection, sectionContent);

      validations.push({
        sectionTitle: this.capitalizeSection(coreSection),
        isPresent,
        isComplete: validation.isComplete,
        score: validation.score,
        maxScore: this.SECTION_WEIGHTS[coreSection] || 10,
        issues: validation.issues,
        recommendations: validation.recommendations
      });
    }

    return validations;
  }

  /**
   * Validate individual section content
   */
  private async validateSection(sectionName: string, content: string): Promise<{
    isComplete: boolean;
    score: number;
    issues: string[];
    recommendations: string[];
  }> {
    const issues: string[] = [];
    const recommendations: string[] = [];
    const maxScore = this.SECTION_WEIGHTS[sectionName] || 10;
    let score = 0;

    if (!content || content.trim().length < 20) {
      issues.push('Section is too short or missing');
      recommendations.push(`Add comprehensive ${sectionName} content`);
      return { isComplete: false, score: 0, issues, recommendations };
    }

    // Section-specific validation
    switch (sectionName) {
      case 'project overview':
        score = await this.validateProjectOverview(content, issues, recommendations);
        break;
      case 'feature specification':
        score = await this.validateFeatureSpecification(content, issues, recommendations);
        break;
      case 'technical architecture':
        score = await this.validateTechnicalArchitecture(content, issues, recommendations);
        break;
      case 'user experience':
        score = await this.validateUserExperience(content, issues, recommendations);
        break;
      case 'implementation approach':
        score = await this.validateImplementationApproach(content, issues, recommendations);
        break;
      case 'success metrics':
        score = await this.validateSuccessMetrics(content, issues, recommendations);
        break;
      case 'constraints & considerations':
        score = await this.validateConstraints(content, issues, recommendations);
        break;
      default:
        score = Math.min(content.length / 100, maxScore); // Basic length scoring
    }

    return {
      isComplete: score >= (maxScore * 0.7),
      score: Math.min(score, maxScore),
      issues,
      recommendations
    };
  }

  /**
   * Validate Project Overview section
   */
  private async validateProjectOverview(content: string, issues: string[], recommendations: string[]): Promise<number> {
    let score = 0;
    const maxScore = this.SECTION_WEIGHTS['project overview'];

    // Check for project name
    if (content.includes('project name') || content.includes('**project:**')) {
      score += 5;
    } else {
      issues.push('Missing project name');
      recommendations.push('Add clear project name identification');
    }

    // Check for domain
    if (content.includes('domain') || content.includes('industry')) {
      score += 5;
    } else {
      issues.push('Missing domain/industry context');
      recommendations.push('Specify the business domain or industry');
    }

    // Check for stakeholders
    if (content.includes('stakeholder') || content.includes('team') || content.includes('roles')) {
      score += 5;
    } else {
      issues.push('Missing stakeholder identification');
      recommendations.push('Identify key stakeholders and team members');
    }

    // Check for project purpose/goals
    if (content.length > 200) {
      score += 5;
    } else {
      recommendations.push('Expand project purpose and context');
    }

    return score;
  }

  /**
   * Validate Feature Specification section
   */
  private async validateFeatureSpecification(content: string, issues: string[], recommendations: string[]): Promise<number> {
    let score = 0;
    const maxScore = this.SECTION_WEIGHTS['feature specification'];

    // Check for functional requirements
    if (content.includes('functional') || content.includes('requirements') || content.includes('features')) {
      score += 8;
    } else {
      issues.push('Missing functional requirements');
      recommendations.push('Add detailed functional requirements');
    }

    // Check for non-functional requirements
    if (content.includes('non-functional') || content.includes('performance') || content.includes('scalability')) {
      score += 8;
    } else {
      issues.push('Missing non-functional requirements');
      recommendations.push('Include performance, scalability, and quality requirements');
    }

    // Check for user stories or acceptance criteria
    if (content.includes('user story') || content.includes('acceptance') || content.includes('criteria') || content.includes('as a')) {
      score += 9;
    } else {
      recommendations.push('Add user stories and acceptance criteria');
    }

    return score;
  }

  /**
   * Validate Technical Architecture section
   */
  private async validateTechnicalArchitecture(content: string, issues: string[], recommendations: string[]): Promise<number> {
    let score = 0;
    const maxScore = this.SECTION_WEIGHTS['technical architecture'];

    // Check for technology stack
    const techKeywords = ['frontend', 'backend', 'database', 'api', 'framework', 'language'];
    if (techKeywords.some(keyword => content.toLowerCase().includes(keyword))) {
      score += 7;
    } else {
      recommendations.push('Specify technology stack components');
    }

    // Check for architecture patterns
    const patterns = ['mvc', 'mvp', 'microservices', 'monolith', 'layered', 'event-driven', 'rest', 'graphql'];
    if (patterns.some(pattern => content.toLowerCase().includes(pattern))) {
      score += 6;
    } else {
      recommendations.push('Describe architectural patterns and design decisions');
    }

    // Check for deployment/infrastructure
    if (content.includes('deploy') || content.includes('cloud') || content.includes('infrastructure')) {
      score += 7;
    } else {
      recommendations.push('Include deployment and infrastructure considerations');
    }

    return score;
  }

  /**
   * Validate User Experience section
   */
  private async validateUserExperience(content: string, issues: string[], recommendations: string[]): Promise<number> {
    let score = 0;
    const maxScore = this.SECTION_WEIGHTS['user experience'];

    // Check for user personas or roles
    if (content.includes('user') || content.includes('persona') || content.includes('role')) {
      score += 8;
    } else {
      recommendations.push('Define user personas and roles');
    }

    // Check for user journeys or workflows
    if (content.includes('journey') || content.includes('workflow') || content.includes('story')) {
      score += 7;
    } else {
      recommendations.push('Document user journeys and key workflows');
    }

    return score;
  }

  /**
   * Validate Implementation Approach section
   */
  private async validateImplementationApproach(content: string, issues: string[], recommendations: string[]): Promise<number> {
    let score = 0;
    const maxScore = this.SECTION_WEIGHTS['implementation approach'];

    // Check for phases or milestones
    if (content.includes('phase') || content.includes('milestone') || content.includes('sprint')) {
      score += 5;
    } else {
      recommendations.push('Break down implementation into phases or milestones');
    }

    // Check for testing strategy
    if (content.includes('test') || content.includes('quality') || content.includes('validation')) {
      score += 5;
    } else {
      recommendations.push('Include testing and quality assurance strategy');
    }

    return score;
  }

  /**
   * Validate Success Metrics section
   */
  private async validateSuccessMetrics(content: string, issues: string[], recommendations: string[]): Promise<number> {
    let score = 0;
    const maxScore = this.SECTION_WEIGHTS['success metrics'];

    // Check for measurable metrics
    if (content.includes('%') || content.includes('metric') || content.includes('kpi') || /\d+/.test(content)) {
      score += 3;
    } else {
      recommendations.push('Define measurable success metrics and KPIs');
    }

    // Check for business value
    if (content.includes('business') || content.includes('value') || content.includes('roi')) {
      score += 2;
    } else {
      recommendations.push('Connect metrics to business value');
    }

    return score;
  }

  /**
   * Validate Constraints section
   */
  private async validateConstraints(content: string, issues: string[], recommendations: string[]): Promise<number> {
    let score = 0;
    const maxScore = this.SECTION_WEIGHTS['constraints & considerations'];

    const constraintTypes = ['technical', 'business', 'timeline', 'budget', 'resource', 'security', 'compliance'];
    const foundConstraints = constraintTypes.filter(type => content.toLowerCase().includes(type));

    score += Math.min(foundConstraints.length, maxScore);

    if (foundConstraints.length === 0) {
      recommendations.push('Identify technical, business, and resource constraints');
    }

    return score;
  }

  /**
   * Detect anti-patterns in the PRP
   */
  private async detectAntiPatterns(content: string, sections: Record<string, string>): Promise<AntiPattern[]> {
    const detectedPatterns: AntiPattern[] = [];

    for (const antiPattern of this.ANTI_PATTERNS) {
      const instances: Array<{ section: string; content: string; suggestion: string; }> = [];

      if (antiPattern.id === 'no-constraints') {
        // Special handling for missing constraints
        const hasConstraints = sections['constraints & considerations'] &&
                              sections['constraints & considerations'].length > 50;
        if (!hasConstraints) {
          instances.push({
            section: 'Overall',
            content: 'No constraints section found',
            suggestion: 'Add a comprehensive constraints and considerations section'
          });
        }
      } else {
        // Pattern-based detection
        for (const pattern of antiPattern.patterns) {
          const matches = content.match(pattern);
          if (matches) {
            for (const match of matches) {
              const section = this.findSectionForContent(match, sections);
              instances.push({
                section,
                content: match,
                suggestion: this.getSuggestionForAntiPattern(antiPattern.id, match)
              });
            }
          }
        }
      }

      if (instances.length > 0) {
        detectedPatterns.push({
          ...antiPattern,
          instances
        });
      }
    }

    return detectedPatterns;
  }

  /**
   * Find which section contains specific content
   */
  private findSectionForContent(content: string, sections: Record<string, string>): string {
    for (const [sectionName, sectionContent] of Object.entries(sections)) {
      if (sectionContent.includes(content)) {
        return this.capitalizeSection(sectionName);
      }
    }
    return 'Unknown Section';
  }

  /**
   * Get specific suggestions for anti-patterns
   */
  private getSuggestionForAntiPattern(patternId: string, matchedContent: string): string {
    const suggestions: Record<string, string> = {
      'vague-requirements': `Replace "${matchedContent}" with specific, measurable criteria`,
      'buzzword-overuse': `Provide concrete justification for technology choices instead of "${matchedContent}"`,
      'vague-language': `Replace "${matchedContent}" with specific, actionable language`,
      'missing-acceptance-criteria': 'Add clear acceptance criteria with Given/When/Then format',
      'unjustified-technology': `Explain why "${matchedContent}" was chosen over alternatives`,
      'no-constraints': 'Add specific technical, business, timeline, and resource constraints'
    };

    return suggestions[patternId] || 'Consider making this more specific and actionable';
  }

  /**
   * Identify missing core elements
   */
  private identifyMissingElements(sections: Record<string, string>): string[] {
    const missing: string[] = [];

    for (const coreSection of this.CORE_SECTIONS) {
      if (!sections[coreSection] || sections[coreSection].trim().length < 20) {
        missing.push(this.capitalizeSection(coreSection));
      }
    }

    return missing;
  }

  /**
   * Generate actionable recommendations
   */
  private generateRecommendations(
    sectionValidations: SectionValidation[],
    antiPatterns: AntiPattern[]
  ): string[] {
    const recommendations: string[] = [];

    // Add section-specific recommendations
    sectionValidations.forEach(section => {
      recommendations.push(...section.recommendations);
    });

    // Add anti-pattern recommendations
    antiPatterns.forEach(pattern => {
      if (pattern.severity === 'critical' || pattern.severity === 'high') {
        recommendations.push(`Address ${pattern.name}: ${pattern.description}`);
      }
    });

    // Remove duplicates and limit to most important
    const uniqueRecommendations = [...new Set(recommendations)];
    return uniqueRecommendations.slice(0, 10); // Top 10 most important
  }

  /**
   * Create empty validation result for invalid input
   */
  private createEmptyValidationResult(): PRPValidationResult {
    return {
      isValid: false,
      score: 0,
      maxScore: 100,
      sections: [],
      recommendations: ['Add comprehensive PRP content with all core sections'],
      missingElements: this.CORE_SECTIONS.map(s => this.capitalizeSection(s)),
      antiPatterns: []
    };
  }

  /**
   * Capitalize section names for display
   */
  private capitalizeSection(sectionName: string): string {
    return sectionName.split(' ').map(word =>
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
  }
}